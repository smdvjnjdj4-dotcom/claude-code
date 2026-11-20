import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { DB } from "@/db";
import {
  businesses,
  campaignDeliveries,
  campaigns,
  marketingConsents,
  notifications,
  users,
  type Campaign,
} from "@/db/schema";
import { sha256 } from "@/lib/crypto";
import { entitlements } from "@/lib/plans";
import { inQuietHours, localDate } from "@/lib/time";
import { env } from "@/lib/env";
import { resolveAudience } from "./audiences";
import { runsThisMonth } from "./campaigns";
import { evaluateMarketingSend, personalize, POLICY, type RecentDelivery } from "./policy";
import { sendWebPush } from "./webpush";

export type Target = { customerId: string; runKey: string };
export type RunSummary = { campaignId: string; sent: number; skipped: number; duplicates: number };

/**
 * Delivers one campaign run to the given targets. Idempotent per (campaign, customer, runKey):
 * a crash and re-run never sends twice. Every decision (sent or skipped + reason) is logged.
 */
export async function deliverCampaign(
  db: DB,
  campaign: Campaign,
  targets: Target[],
  now = new Date(),
  opts: { quietHours?: boolean } = {},
): Promise<RunSummary> {
  const summary: RunSummary = { campaignId: campaign.id, sent: 0, skipped: 0, duplicates: 0 };
  if (!targets.length) return summary;
  const contentHash = sha256(`${campaign.title}\n${campaign.body}`);
  const ids = [...new Set(targets.map((t) => t.customerId))];

  const consentRows = await db
    .select({ customerId: marketingConsents.customerId })
    .from(marketingConsents)
    .where(and(eq(marketingConsents.businessId, campaign.businessId), eq(marketingConsents.status, "granted"), inArray(marketingConsents.customerId, ids)));
  const consented = new Set(consentRows.map((r) => r.customerId));
  const userRows = await db
    .select({ id: users.id, name: users.name, paused: users.marketingPaused })
    .from(users)
    .where(inArray(users.id, ids));
  const userById = new Map(userRows.map((u) => [u.id, u]));
  const quiet = opts.quietHours ?? inQuietHours(now);

  for (const t of targets) {
    const u = userById.get(t.customerId);
    if (!u) continue;
    // Recent history is reloaded per customer so caps also account for messages sent in this very run.
    const recentRows = await db
      .select({ businessId: campaignDeliveries.businessId, contentHash: campaignDeliveries.contentHash, at: campaignDeliveries.createdAt })
      .from(campaignDeliveries)
      .where(
        and(
          eq(campaignDeliveries.customerId, t.customerId),
          eq(campaignDeliveries.status, "sent"),
          gte(campaignDeliveries.createdAt, new Date(now.getTime() - POLICY.duplicateContentWindowDays * 86400_000)),
        ),
      );
    const verdict = evaluateMarketingSend({
      now,
      businessId: campaign.businessId,
      contentHash,
      consentGranted: consented.has(t.customerId),
      userMarketingPaused: u.paused,
      quietHours: quiet,
      recent: recentRows as RecentDelivery[],
    });

    const inserted = await db
      .insert(campaignDeliveries)
      .values({
        campaignId: campaign.id,
        businessId: campaign.businessId,
        customerId: t.customerId,
        runKey: t.runKey,
        status: verdict.ok ? "sent" : "skipped",
        reason: verdict.ok ? null : verdict.reason,
        contentHash,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: campaignDeliveries.id });
    if (!inserted.length) {
      summary.duplicates++;
      continue;
    }
    if (!verdict.ok) {
      summary.skipped++;
      continue;
    }
    const title = personalize(campaign.title, u.name);
    const body = personalize(campaign.body, u.name);
    await db.insert(notifications).values({
      userId: t.customerId,
      businessId: campaign.businessId,
      campaignId: campaign.id,
      kind: "marketing",
      title,
      body,
      imagePath: campaign.imagePath,
      link: campaign.link,
      createdAt: now,
    });
    const pushed = await sendWebPush(db, t.customerId, {
      title,
      body,
      url: campaign.link ?? "/notifications",
      image: campaign.imagePath ? `/api/files/${campaign.imagePath}` : null,
      tag: `campaign-${campaign.id}`,
    }).catch(() => 0);
    if (pushed) await db.update(campaignDeliveries).set({ pushSent: pushed }).where(eq(campaignDeliveries.id, inserted[0].id));
    summary.sent++;
  }
  return summary;
}

/** Event-based targets for trigger campaigns; each runKey identifies one "episode" so nobody gets nagged. */
export async function triggerTargets(db: DB, c: Campaign, now = new Date()): Promise<Target[]> {
  const b = c.businessId;
  switch (c.trigger) {
    case "inactive_days": {
      const days = c.triggerParam ?? 14;
      const rows = await db.execute<{ customer_id: string; last: string }>(sql`
        select customer_id, max(created_at)::date::text as last from stamp_events
        where business_id = ${b} and customer_id is not null
        group by customer_id
        having max(created_at) < ${now.toISOString()}::timestamptz - make_interval(days => ${days})
           and max(created_at) > ${now.toISOString()}::timestamptz - make_interval(days => ${days + 60})`);
      return rows.map((r) => ({ customerId: r.customer_id, runKey: `inactive:${r.last}` }));
    }
    case "one_stamp_left": {
      const rows = await db.execute<{ customer_id: string; program_id: string; total: number }>(sql`
        select se.customer_id, se.program_id,
               (select count(*) from stamp_events x where x.program_id = se.program_id and x.customer_id = se.customer_id)::int as total
        from stamp_events se
        join loyalty_programs p on p.id = se.program_id and p.status = 'active'
        where se.business_id = ${b} and se.customer_id is not null and se.consumed_by_reward_id is null
          and (se.expires_at is null or se.expires_at > ${now.toISOString()}::timestamptz)
        group by se.customer_id, se.program_id, p.stamps_required
        having count(*) = p.stamps_required - 1 and p.stamps_required > 1`);
      return rows.map((r) => ({ customerId: r.customer_id, runKey: `osl:${r.program_id}:${r.total}` }));
    }
    case "reward_available": {
      // Reminder after the reward has been waiting for 3 days.
      const rows = await db.execute<{ id: string; customer_id: string }>(sql`
        select id, customer_id from rewards
        where business_id = ${b} and status = 'available' and customer_id is not null
          and created_at < ${now.toISOString()}::timestamptz - interval '3 days'
          and created_at > ${now.toISOString()}::timestamptz - interval '60 days'
          and (expires_at is null or expires_at > ${now.toISOString()}::timestamptz)`);
      return rows.map((r) => ({ customerId: r.customer_id, runKey: `reward:${r.id}` }));
    }
    case "new_program": {
      const rows = await db.execute<{ id: string }>(sql`
        select id from loyalty_programs where business_id = ${b} and status = 'active'
          and created_at >= ${c.createdAt.toISOString()}::timestamptz`);
      if (!rows.length) return [];
      const audience = await resolveAudience(db, b, { segment: "all_consented" });
      return rows.flatMap((p) => audience.map((id) => ({ customerId: id, runKey: `program:${p.id}` })));
    }
    case "birthday": {
      const today = localDate(now);
      const md = today.slice(5);
      // Only customers who explicitly consented to birthday processing (birthday_consent_at).
      const rows = await db.execute<{ id: string }>(sql`
        select u.id from users u
        join marketing_consents mc on mc.customer_id = u.id and mc.business_id = ${b} and mc.status = 'granted'
        where u.birthday is not null and u.birthday_consent_at is not null
          and to_char(u.birthday, 'MM-DD') = ${md}`);
      return rows.map((r) => ({ customerId: r.id, runKey: `birthday:${today.slice(0, 4)}` }));
    }
    default:
      return [];
  }
}

/**
 * The scheduler tick (run every minute by `npm run worker` or the cron endpoint).
 * Marketing is never sent during quiet hours – due campaigns simply wait.
 */
export async function runDueCampaigns(db: DB, now = new Date()) {
  const results: RunSummary[] = [];
  if (inQuietHours(now)) return { quietHours: true, results };

  const due = await db
    .select({ c: campaigns, plan: businesses.plan })
    .from(campaigns)
    .innerJoin(businesses, eq(businesses.id, campaigns.businessId))
    .where(
      or(
        and(eq(campaigns.type, "manual"), eq(campaigns.status, "scheduled"), lte(campaigns.scheduledAt, now)),
        and(eq(campaigns.type, "recurring"), eq(campaigns.status, "active"), lte(campaigns.nextRunAt, now)),
        and(
          eq(campaigns.type, "trigger"),
          eq(campaigns.status, "active"),
          or(isNull(campaigns.lastRunAt), lte(campaigns.lastRunAt, new Date(now.getTime() - 15 * 60_000))),
        ),
      ),
    )
    .limit(50);

  for (const { c, plan } of due) {
    // Claim the campaign (prevents two workers running the same campaign concurrently).
    const claimed = await db
      .update(campaigns)
      .set({ lastRunAt: now })
      .where(and(eq(campaigns.id, c.id), c.lastRunAt ? eq(campaigns.lastRunAt, c.lastRunAt) : isNull(campaigns.lastRunAt)))
      .returning({ id: campaigns.id });
    if (!claimed.length) continue;

    const e = entitlements(plan);
    const allowed =
      c.type === "manual" ? e.manualPush : c.type === "recurring" ? e.recurringCampaigns
      : c.trigger === "inactive_days" || c.trigger === "birthday" ? e.advancedAutomations : e.basicAutomations;
    if (!allowed) {
      await db.update(campaigns).set({ status: "paused", updatedAt: now }).where(eq(campaigns.id, c.id));
      continue;
    }
    if (c.type !== "trigger" && (await runsThisMonth(db, c.businessId, now)) >= e.monthlyCampaignRuns) {
      // Quota exhausted: try again tomorrow (recurring) / keep scheduled (manual).
      await db.update(campaigns).set({ nextRunAt: new Date(now.getTime() + 86400_000) }).where(eq(campaigns.id, c.id));
      if (c.type === "manual") await db.update(campaigns).set({ scheduledAt: new Date(now.getTime() + 86400_000) }).where(eq(campaigns.id, c.id));
      continue;
    }

    let targets: Target[];
    if (c.type === "trigger") {
      targets = await triggerTargets(db, c, now);
    } else {
      const runKey = c.type === "manual" ? "once" : `run:${localDate(c.nextRunAt ?? now, env.timezone)}`;
      targets = (await resolveAudience(db, c.businessId, c.audience)).map((id) => ({ customerId: id, runKey }));
    }
    results.push(await deliverCampaign(db, c, targets, now, { quietHours: false }));

    if (c.type === "manual") {
      await db.update(campaigns).set({ status: "sent", updatedAt: now }).where(eq(campaigns.id, c.id));
    } else if (c.type === "recurring") {
      let next = (c.nextRunAt ?? now).getTime();
      const step = (c.intervalDays ?? 7) * 86400_000;
      while (next <= now.getTime()) next += step;
      await db.update(campaigns).set({ nextRunAt: new Date(next) }).where(eq(campaigns.id, c.id));
    }
  }
  return { quietHours: false, results };
}
