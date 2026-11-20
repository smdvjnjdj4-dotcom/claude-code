import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import { locations, loyaltyPrograms, offers, type LoyaltyProgram, type RewardType } from "@/db/schema";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { entitlements } from "@/lib/plans";
import { formatEuro } from "@/lib/time";
import { requireMember } from "./access";

export const REWARD_TYPES: { id: RewardType; label: string; hint: string }[] = [
  { id: "free_product", label: "Kostenloses Produkt", hint: "z. B. 1 Kaffee gratis" },
  { id: "percent_discount", label: "Prozentrabatt", hint: "z. B. 20 % auf den nächsten Termin" },
  { id: "fixed_discount", label: "Fester Rabatt", hint: "z. B. 10 € Rabatt" },
  { id: "free_service", label: "Kostenlose Dienstleistung", hint: "z. B. Augenbrauen zupfen gratis" },
  { id: "free_upgrade", label: "Kostenloses Upgrade", hint: "z. B. großer statt kleiner Becher" },
  { id: "custom", label: "Individuelle Belohnung", hint: "Frei beschreiben" },
];

const nullableInt = (min: number, max: number) =>
  z
    .preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.number().int().min(min).max(max).nullable())
    .optional()
    .transform((v) => v ?? null);
const nullableDate = z
  .preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date().nullable())
  .optional()
  .transform((v) => v ?? null);

export const programInput = z
  .object({
    name: z.string().trim().min(2, "Bitte gib einen Namen an.").max(60),
    description: z.string().trim().max(500).default(""),
    stampsRequired: z.coerce.number().int().min(2, "Mindestens 2 Stempel.").max(30, "Höchstens 30 Stempel."),
    rewardType: z.enum(["free_product", "percent_discount", "fixed_discount", "free_service", "free_upgrade", "custom"]),
    rewardTitle: z.string().trim().min(2, "Bitte beschreibe die Belohnung.").max(80),
    rewardValue: nullableInt(1, 100000),
    minPurchaseCents: z.coerce.number().int().min(0).max(100000).default(0),
    stampValidityDays: nullableInt(7, 1095),
    rewardValidityDays: nullableInt(7, 365),
    maxStampsPerDay: z.coerce.number().int().min(1).max(10).default(1),
    locationIds: z.array(z.string().uuid()).default([]),
    eligibleItems: z.string().trim().max(300).default(""),
    redemptionTerms: z.string().trim().max(500).default(""),
    startsAt: nullableDate,
    endsAt: nullableDate,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6C47FF"),
  })
  .superRefine((v, ctx) => {
    if (v.rewardType === "percent_discount" && (v.rewardValue == null || v.rewardValue > 100))
      ctx.addIssue({ code: "custom", path: ["rewardValue"], message: "Bitte einen Prozentwert zwischen 1 und 100 angeben." });
    if (v.rewardType === "fixed_discount" && v.rewardValue == null)
      ctx.addIssue({ code: "custom", path: ["rewardValue"], message: "Bitte einen Rabattbetrag angeben." });
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt)
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Das Enddatum muss nach dem Startdatum liegen." });
  });

export type ProgramInput = z.input<typeof programInput>;

export function describeReward(p: Pick<LoyaltyProgram, "rewardType" | "rewardValue" | "rewardTitle">) {
  if (p.rewardType === "percent_discount" && p.rewardValue) return `${p.rewardValue} % Rabatt – ${p.rewardTitle}`;
  if (p.rewardType === "fixed_discount" && p.rewardValue) return `${formatEuro(p.rewardValue)} Rabatt – ${p.rewardTitle}`;
  return p.rewardTitle;
}

async function validateLocations(db: DB, businessId: string, ids: string[]) {
  if (!ids.length) return;
  const own = await db.select({ id: locations.id }).from(locations).where(eq(locations.businessId, businessId));
  const set = new Set(own.map((l) => l.id));
  if (ids.some((id) => !set.has(id))) throw new DomainError("invalid_location", "Ungültige Filialauswahl.");
}

async function assertActiveQuota(db: DB, businessId: string, plan: Parameters<typeof entitlements>[0], excludeId?: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(loyaltyPrograms)
    .where(
      and(
        eq(loyaltyPrograms.businessId, businessId),
        eq(loyaltyPrograms.status, "active"),
        excludeId ? ne(loyaltyPrograms.id, excludeId) : sql`true`,
      ),
    );
  if (n >= entitlements(plan).maxActivePrograms) {
    throw new DomainError("plan_required", "Dein Tarif erlaubt keine weiteren aktiven Treueprogramme. Pausiere ein Programm oder wechsle den Tarif.");
  }
}

export async function createProgram(db: DB, actorId: string, businessId: string, input: ProgramInput, activate: boolean) {
  const ctx = await requireMember(db, actorId, businessId, "programs.manage");
  const v = programInput.parse(input);
  await validateLocations(db, businessId, v.locationIds);
  if (activate) await assertActiveQuota(db, businessId, ctx.business.plan);
  const [p] = await db
    .insert(loyaltyPrograms)
    .values({
      ...v,
      rewardValue: ["percent_discount", "fixed_discount"].includes(v.rewardType) ? v.rewardValue : null,
      locationIds: v.locationIds.length ? v.locationIds : null,
      businessId,
      status: activate ? "active" : "draft",
    })
    .returning();
  await audit(db, { actorId, businessId, action: "program.created", targetType: "program", targetId: p.id });
  return p;
}

/**
 * Updates a program. Fairness rule: once customers have collected stamps, the number of
 * required stamps may be lowered but never raised.
 */
export async function updateProgram(db: DB, actorId: string, businessId: string, programId: string, input: ProgramInput) {
  await requireMember(db, actorId, businessId, "programs.manage");
  const existing = await getOwnProgram(db, businessId, programId);
  const v = programInput.parse(input);
  await validateLocations(db, businessId, v.locationIds);
  if (v.stampsRequired > existing.stampsRequired) {
    const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from stamp_events where program_id = ${programId}`);
    if (Number(n) > 0) {
      throw new DomainError(
        "unfair_change",
        "Kund:innen sammeln bereits Stempel. Die benötigte Anzahl darf deshalb nicht erhöht werden – lege dafür ein neues Programm an.",
      );
    }
  }
  const [p] = await db
    .update(loyaltyPrograms)
    .set({
      ...v,
      rewardValue: ["percent_discount", "fixed_discount"].includes(v.rewardType) ? v.rewardValue : null,
      locationIds: v.locationIds.length ? v.locationIds : null,
      updatedAt: new Date(),
    })
    .where(and(eq(loyaltyPrograms.id, programId), eq(loyaltyPrograms.businessId, businessId)))
    .returning();
  await audit(db, { actorId, businessId, action: "program.updated", targetType: "program", targetId: programId });
  return p;
}

export async function setProgramStatus(db: DB, actorId: string, businessId: string, programId: string, status: "active" | "paused" | "archived") {
  const ctx = await requireMember(db, actorId, businessId, "programs.manage");
  const p = await getOwnProgram(db, businessId, programId);
  if (status === "active" && p.status !== "active") await assertActiveQuota(db, businessId, ctx.business.plan, programId);
  await db.update(loyaltyPrograms).set({ status, updatedAt: new Date() }).where(eq(loyaltyPrograms.id, programId));
  await audit(db, { actorId, businessId, action: `program.${status}`, targetType: "program", targetId: programId });
}

export async function setProgramImage(db: DB, actorId: string, businessId: string, programId: string, key: string | null) {
  await requireMember(db, actorId, businessId, "programs.manage");
  await getOwnProgram(db, businessId, programId);
  await db.update(loyaltyPrograms).set({ imagePath: key }).where(eq(loyaltyPrograms.id, programId));
}

async function getOwnProgram(db: DB, businessId: string, programId: string) {
  const [p] = await db.select().from(loyaltyPrograms).where(and(eq(loyaltyPrograms.id, programId), eq(loyaltyPrograms.businessId, businessId)));
  if (!p) throw new DomainError("not_found", "Treueprogramm nicht gefunden.");
  return p;
}

export async function getProgram(db: DB, actorId: string, businessId: string, programId: string) {
  await requireMember(db, actorId, businessId);
  return getOwnProgram(db, businessId, programId);
}

export async function listPrograms(db: DB, businessId: string, opts: { includeArchived?: boolean } = {}) {
  const rows = await db
    .select({
      program: loyaltyPrograms,
      participants: sql<number>`(select count(distinct customer_id)::int from stamp_events se where se.program_id = ${loyaltyPrograms.id})`,
      stamps: sql<number>`(select count(*)::int from stamp_events se where se.program_id = ${loyaltyPrograms.id})`,
      rewardsRedeemed: sql<number>`(select count(*)::int from rewards r where r.program_id = ${loyaltyPrograms.id} and r.status = 'redeemed')`,
    })
    .from(loyaltyPrograms)
    .where(and(eq(loyaltyPrograms.businessId, businessId), opts.includeArchived ? sql`true` : ne(loyaltyPrograms.status, "archived")))
    .orderBy(asc(loyaltyPrograms.createdAt));
  return rows.map((r) => ({ ...r.program, participants: Number(r.participants), stamps: Number(r.stamps), rewardsRedeemed: Number(r.rewardsRedeemed) }));
}

/* ─────────────────────────── Offers ─────────────────────────── */

export const offerInput = z.object({
  title: z.string().trim().min(3, "Titel fehlt.").max(80),
  description: z.string().trim().max(400).default(""),
  newCustomersOnly: z.coerce.boolean().default(false),
  startsAt: nullableDate,
  endsAt: nullableDate,
});

export async function createOffer(db: DB, actorId: string, businessId: string, input: z.input<typeof offerInput>) {
  const ctx = await requireMember(db, actorId, businessId, "offers.manage");
  if (!entitlements(ctx.business.plan).offers) throw new DomainError("plan_required", "Aktionen & Angebote sind ab dem Business-Tarif verfügbar.");
  const v = offerInput.parse(input);
  const [o] = await db.insert(offers).values({ ...v, businessId }).returning();
  await audit(db, { actorId, businessId, action: "offer.created", targetId: o.id });
  return o;
}

export async function setOfferActive(db: DB, actorId: string, businessId: string, offerId: string, active: boolean) {
  await requireMember(db, actorId, businessId, "offers.manage");
  await db.update(offers).set({ active }).where(and(eq(offers.id, offerId), eq(offers.businessId, businessId)));
}

export async function deleteOffer(db: DB, actorId: string, businessId: string, offerId: string) {
  await requireMember(db, actorId, businessId, "offers.manage");
  await db.delete(offers).where(and(eq(offers.id, offerId), eq(offers.businessId, businessId)));
}

export async function listOffers(db: DB, businessId: string) {
  return db.select().from(offers).where(eq(offers.businessId, businessId)).orderBy(desc(offers.createdAt));
}
