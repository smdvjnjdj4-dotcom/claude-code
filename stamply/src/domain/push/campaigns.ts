import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import { campaignDeliveries, campaigns, type Campaign } from "@/db/schema";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { entitlements } from "@/lib/plans";
import { requireMember } from "../access";
import { sanitizeInternalLink } from "./policy";

export const TRIGGERS = {
  inactive_days: { label: "Kein Besuch seit X Tagen", tier: "advanced", needsParam: true },
  one_stamp_left: { label: "Nur noch 1 Stempel bis zur Belohnung", tier: "basic", needsParam: false },
  reward_available: { label: "Belohnung wartet auf Einlösung", tier: "basic", needsParam: false },
  new_program: { label: "Neues Treueprogramm veröffentlicht", tier: "basic", needsParam: false },
  birthday: { label: "Geburtstag (nur mit Einwilligung)", tier: "advanced", needsParam: false },
} as const;

const segmentEnum = z.enum([
  "all_consented",
  "active_regulars",
  "inactive_14",
  "inactive_30",
  "almost_complete",
  "reward_available",
  "new_customers",
]);

export const campaignInput = z
  .object({
    name: z.string().trim().min(2, "Bitte gib der Kampagne einen Namen.").max(80),
    type: z.enum(["manual", "recurring", "trigger"]),
    trigger: z.enum(["inactive_days", "one_stamp_left", "reward_available", "birthday", "new_program"]).nullish(),
    triggerParam: z.coerce.number().int().min(7).max(180).nullish(),
    segment: segmentEnum.default("all_consented"),
    programId: z.string().uuid().nullish(),
    title: z.string().trim().min(2, "Titel fehlt.").max(60, "Titel: max. 60 Zeichen."),
    body: z.string().trim().min(5, "Nachricht fehlt.").max(240, "Nachricht: max. 240 Zeichen."),
    link: z.string().trim().max(300).nullish(),
    sendMode: z.enum(["now", "later"]).default("now"),
    scheduledAt: z.coerce.date().nullish(),
    intervalDays: z.coerce.number().int().min(7, "Mindestens alle 7 Tage.").max(365).nullish(),
    imagePath: z.string().nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "trigger" && !v.trigger) ctx.addIssue({ code: "custom", path: ["trigger"], message: "Bitte einen Auslöser wählen." });
    if (v.type === "trigger" && v.trigger === "inactive_days" && !v.triggerParam)
      ctx.addIssue({ code: "custom", path: ["triggerParam"], message: "Bitte Anzahl Tage angeben (7–180)." });
    if (v.type === "recurring" && !v.intervalDays)
      ctx.addIssue({ code: "custom", path: ["intervalDays"], message: "Bitte ein Intervall wählen." });
    if (v.type !== "trigger" && v.sendMode === "later" && !v.scheduledAt)
      ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Bitte einen Versandzeitpunkt wählen." });
  });

export type CampaignInput = z.input<typeof campaignInput>;

function assertEntitled(plan: Parameters<typeof entitlements>[0], v: z.output<typeof campaignInput>) {
  const e = entitlements(plan);
  if (!e.manualPush) {
    throw new DomainError("plan_required", "Push-Kampagnen sind ab dem Business-Tarif verfügbar.");
  }
  if (v.type === "recurring" && !e.recurringCampaigns) {
    throw new DomainError("plan_required", "Wiederkehrende Kampagnen sind in deinem Tarif nicht enthalten.");
  }
  if (v.type === "trigger") {
    const tier = TRIGGERS[v.trigger!].tier;
    if (tier === "basic" && !e.basicAutomations) throw new DomainError("plan_required", "Automationen sind in deinem Tarif nicht enthalten.");
    if (tier === "advanced" && !e.advancedAutomations) {
      throw new DomainError("plan_required", "Rückgewinnungs- und Geburtstagsautomationen sind im Premium-Tarif enthalten.");
    }
  }
  if (v.type === "recurring" && v.intervalDays && ![7, 14, 30].includes(v.intervalDays) && !e.advancedAutomations) {
    throw new DomainError("plan_required", "Benutzerdefinierte Intervalle sind im Premium-Tarif enthalten.");
  }
}

function toRow(v: z.output<typeof campaignInput>, now: Date) {
  const link = v.link ? sanitizeInternalLink(v.link) : null;
  if (v.link && !link) throw new DomainError("invalid_link", "Der Link muss auf eine Seite innerhalb von STAMPLY zeigen (z. B. /b/mein-cafe).");
  const start = v.sendMode === "later" && v.scheduledAt ? v.scheduledAt : now;
  if (v.sendMode === "later" && start.getTime() < now.getTime() - 60_000) {
    throw new DomainError("invalid_date", "Der Versandzeitpunkt liegt in der Vergangenheit.");
  }
  return {
    name: v.name,
    type: v.type,
    trigger: v.type === "trigger" ? v.trigger! : null,
    triggerParam: v.type === "trigger" && v.trigger === "inactive_days" ? v.triggerParam! : null,
    audience: { segment: v.type === "trigger" ? ("all_consented" as const) : v.segment, programId: v.programId ?? null },
    title: v.title,
    body: v.body,
    link,
    imagePath: v.imagePath ?? null,
    scheduledAt: v.type === "trigger" ? null : start,
    intervalDays: v.type === "recurring" ? v.intervalDays! : null,
    nextRunAt: v.type === "trigger" ? now : start,
  };
}

/** Creates a campaign. `activate=false` stores it as draft. */
export async function createCampaign(db: DB, actorId: string, businessId: string, input: CampaignInput, activate: boolean) {
  const ctx = await requireMember(db, actorId, businessId, "campaigns.manage");
  const v = campaignInput.parse(input);
  assertEntitled(ctx.business.plan, v);
  const now = new Date();
  const row = toRow(v, now);
  const status = !activate ? "draft" : v.type === "manual" ? "scheduled" : "active";
  const [c] = await db
    .insert(campaigns)
    .values({ ...row, businessId, status, createdBy: actorId })
    .returning();
  await audit(db, { actorId, businessId, action: "campaign.created", targetType: "campaign", targetId: c.id, meta: { type: c.type, status } });
  return c;
}

export async function updateCampaign(db: DB, actorId: string, businessId: string, campaignId: string, input: CampaignInput) {
  const ctx = await requireMember(db, actorId, businessId, "campaigns.manage");
  const existing = await getOwnCampaign(db, businessId, campaignId);
  if (existing.status === "sent") throw new DomainError("immutable", "Versendete Kampagnen können nicht mehr bearbeitet werden.");
  const v = campaignInput.parse(input);
  assertEntitled(ctx.business.plan, v);
  const row = toRow(v, new Date());
  const [c] = await db
    .update(campaigns)
    .set({ ...row, updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.businessId, businessId)))
    .returning();
  await audit(db, { actorId, businessId, action: "campaign.updated", targetType: "campaign", targetId: campaignId });
  return c;
}

export async function setCampaignStatus(
  db: DB,
  actorId: string,
  businessId: string,
  campaignId: string,
  action: "activate" | "pause" | "archive",
) {
  const ctx = await requireMember(db, actorId, businessId, "campaigns.manage");
  const c = await getOwnCampaign(db, businessId, campaignId);
  let status: Campaign["status"];
  let nextRunAt = c.nextRunAt;
  if (action === "pause") {
    if (!["scheduled", "active"].includes(c.status)) throw new DomainError("invalid_state", "Nur aktive Kampagnen können pausiert werden.");
    status = "paused";
  } else if (action === "archive") {
    status = "archived";
  } else {
    if (c.status === "sent" || c.status === "archived") throw new DomainError("invalid_state", "Diese Kampagne kann nicht mehr aktiviert werden.");
    assertEntitled(ctx.business.plan, campaignInput.parse({
      name: c.name, type: c.type, trigger: c.trigger, triggerParam: c.triggerParam, segment: c.audience.segment,
      title: c.title, body: c.body, intervalDays: c.intervalDays,
    }));
    status = c.type === "manual" ? "scheduled" : "active";
    if (c.type !== "manual" && (!nextRunAt || nextRunAt < new Date())) nextRunAt = new Date();
  }
  const [u] = await db
    .update(campaigns)
    .set({ status, nextRunAt, updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.businessId, businessId)))
    .returning();
  await audit(db, { actorId, businessId, action: `campaign.${action}`, targetType: "campaign", targetId: campaignId });
  return u;
}

async function getOwnCampaign(db: DB, businessId: string, campaignId: string) {
  const [c] = await db.select().from(campaigns).where(and(eq(campaigns.id, campaignId), eq(campaigns.businessId, businessId)));
  if (!c) throw new DomainError("not_found", "Kampagne nicht gefunden.");
  return c;
}

export async function getCampaign(db: DB, actorId: string, businessId: string, campaignId: string) {
  await requireMember(db, actorId, businessId, "campaigns.manage");
  return getOwnCampaign(db, businessId, campaignId);
}

export async function listCampaigns(db: DB, actorId: string, businessId: string) {
  await requireMember(db, actorId, businessId, "campaigns.manage");
  const rows = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.businessId, businessId), ne(campaigns.status, "archived")))
    .orderBy(desc(campaigns.createdAt));
  const ids = rows.map((r) => r.id);
  const stats = ids.length
    ? await db
        .select({
          campaignId: campaignDeliveries.campaignId,
          sent: sql<number>`count(*) filter (where ${campaignDeliveries.status} = 'sent')::int`,
          skipped: sql<number>`count(*) filter (where ${campaignDeliveries.status} = 'skipped')::int`,
        })
        .from(campaignDeliveries)
        .where(inArray(campaignDeliveries.campaignId, ids))
        .groupBy(campaignDeliveries.campaignId)
    : [];
  const byId = new Map(stats.map((s) => [s.campaignId, s]));
  return rows.map((r) => ({ ...r, sent: Number(byId.get(r.id)?.sent ?? 0), skipped: Number(byId.get(r.id)?.skipped ?? 0) }));
}

export async function deliveryLog(db: DB, actorId: string, businessId: string, campaignId: string) {
  await requireMember(db, actorId, businessId, "campaigns.manage");
  return db
    .select({
      id: campaignDeliveries.id,
      status: campaignDeliveries.status,
      reason: campaignDeliveries.reason,
      runKey: campaignDeliveries.runKey,
      pushSent: campaignDeliveries.pushSent,
      createdAt: campaignDeliveries.createdAt,
    })
    .from(campaignDeliveries)
    .where(and(eq(campaignDeliveries.businessId, businessId), eq(campaignDeliveries.campaignId, campaignId)))
    .orderBy(desc(campaignDeliveries.createdAt))
    .limit(200);
}

/** Number of manual/recurring campaign runs this calendar month (plan quota). */
export async function runsThisMonth(db: DB, businessId: string, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [r] = await db
    .select({ n: sql<number>`count(distinct (${campaignDeliveries.campaignId}, ${campaignDeliveries.runKey}))::int` })
    .from(campaignDeliveries)
    .innerJoin(campaigns, eq(campaigns.id, campaignDeliveries.campaignId))
    .where(and(eq(campaignDeliveries.businessId, businessId), gte(campaignDeliveries.createdAt, start), ne(campaigns.type, "trigger")));
  return Number(r?.n ?? 0);
}
