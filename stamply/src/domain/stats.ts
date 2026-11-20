import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import { requireMember } from "./access";

export type Metric = { value: number; kind: "measured" | "estimated"; note?: string };

const n = (v: unknown) => Number(v ?? 0);

/**
 * Dashboard KPIs. Everything is a direct count from the database ("measured") unless explicitly
 * marked "estimated" – estimates are labelled in the UI and explain their basis.
 */
export async function businessOverview(db: DB, actorId: string, businessId: string, days = 30) {
  await requireMember(db, actorId, businessId, "stats.view");
  const b = businessId;
  const [row] = await db.execute<Record<string, unknown>>(sql`
    with se as (select * from stamp_events where business_id = ${b}),
    period as (select * from se where created_at > now() - make_interval(days => ${days}))
    select
      (select count(distinct customer_id) from se where created_at > now() - interval '90 days' and customer_id is not null) as active_participants,
      (select count(*) from (select customer_id from se where customer_id is not null group by customer_id
          having min(created_at) > now() - make_interval(days => ${days})) x) as new_participants,
      (select count(*) from period) as stamps,
      (select count(*) from rewards where business_id = ${b} and redeemed_at > now() - make_interval(days => ${days})) as redeemed,
      (select count(*) from rewards where business_id = ${b} and status = 'available') as open_rewards,
      (select count(*) from (select customer_id from period where customer_id is not null group by customer_id
          having count(distinct date_trunc('day', created_at)) >= 2) x) as returning_customers,
      (select count(distinct customer_id) from period where customer_id is not null) as period_customers,
      (select count(*) from profile_views where business_id = ${b} and day > (now() - make_interval(days => ${days}))::date) as profile_views,
      (select count(*) from campaigns where business_id = ${b} and status in ('active','scheduled')) as active_campaigns,
      (select count(*) from campaign_deliveries where business_id = ${b} and status = 'sent' and created_at > now() - make_interval(days => ${days})) as push_sent,
      (select count(*) from campaign_deliveries where business_id = ${b} and status = 'skipped' and created_at > now() - make_interval(days => ${days})) as push_skipped,
      (select count(*) from notifications where business_id = ${b} and kind = 'marketing' and read_at is not null and created_at > now() - make_interval(days => ${days})) as push_opened,
      (select count(*) from marketing_consents where business_id = ${b} and status = 'granted') as subscribers,
      (select count(*) from receipts where business_id = ${b} and status = 'needs_review') as receipts_pending,
      (select count(*) from receipts where business_id = ${b} and status = 'approved' and detected_amount_cents is not null) as receipts_with_amount,
      (select avg(detected_amount_cents) from receipts where business_id = ${b} and status = 'approved' and detected_amount_cents is not null) as avg_receipt_cents
  `);

  const periodCustomers = n(row.period_customers);
  const withAmount = n(row.receipts_with_amount);
  const avg = row.avg_receipt_cents == null ? null : Math.round(n(row.avg_receipt_cents));

  return {
    days,
    activeParticipants: { value: n(row.active_participants), kind: "measured", note: "Kund:innen mit Stempel in den letzten 90 Tagen" } as Metric,
    newParticipants: { value: n(row.new_participants), kind: "measured" } as Metric,
    stamps: { value: n(row.stamps), kind: "measured" } as Metric,
    redeemed: { value: n(row.redeemed), kind: "measured" } as Metric,
    openRewards: { value: n(row.open_rewards), kind: "measured" } as Metric,
    returningCustomers: { value: n(row.returning_customers), kind: "measured", note: "An mind. 2 verschiedenen Tagen gestempelt" } as Metric,
    returningRate: periodCustomers ? Math.round((n(row.returning_customers) / periodCustomers) * 100) : null,
    profileViews: { value: n(row.profile_views), kind: "measured", note: "Eindeutige Besucher:innen pro Tag" } as Metric,
    activeCampaigns: { value: n(row.active_campaigns), kind: "measured" } as Metric,
    pushSent: { value: n(row.push_sent), kind: "measured" } as Metric,
    pushSkipped: { value: n(row.push_skipped), kind: "measured" } as Metric,
    pushOpened: { value: n(row.push_opened), kind: "measured", note: "In der App geöffnet" } as Metric,
    subscribers: { value: n(row.subscribers), kind: "measured" } as Metric,
    receiptsPending: n(row.receipts_pending),
    // Estimate: only shown when based on at least 5 receipts with a recognised amount.
    estimatedRevenue:
      avg !== null && withAmount >= 5
        ? ({
            value: Math.round(avg * n(row.stamps)),
            kind: "estimated",
            note: `Schätzung: ${n(row.stamps)} Stempel × Ø-Bonbetrag aus ${withAmount} erkannten Belegen`,
          } as Metric)
        : null,
  };
}

export async function stampsPerDay(db: DB, actorId: string, businessId: string, days = 30) {
  await requireMember(db, actorId, businessId, "stats.view");
  const rows = await db.execute<{ day: string; stamps: number; redeemed: number }>(sql`
    select d::date::text as day,
      (select count(*)::int from stamp_events se where se.business_id = ${businessId} and se.created_at::date = d::date) as stamps,
      (select count(*)::int from rewards r where r.business_id = ${businessId} and r.redeemed_at::date = d::date) as redeemed
    from generate_series(current_date - make_interval(days => ${days - 1}), current_date, interval '1 day') d
    order by d`);
  return rows.map((r) => ({ day: r.day, stamps: n(r.stamps), redeemed: n(r.redeemed) }));
}

export async function stampsBySource(db: DB, businessId: string, days = 30) {
  const rows = await db.execute<{ source: string; c: number }>(sql`
    select source::text, count(*)::int as c from stamp_events
    where business_id = ${businessId} and created_at > now() - make_interval(days => ${days}) group by source`);
  return Object.fromEntries(rows.map((r) => [r.source, n(r.c)])) as Record<string, number>;
}

/** Pseudonymised customer list for the business (first name + initial, no contact data). */
export async function customerList(db: DB, actorId: string, businessId: string) {
  await requireMember(db, actorId, businessId, "customers.view");
  const rows = await db.execute<Record<string, unknown>>(sql`
    select u.id, u.name,
      count(se.id)::int as stamps_total,
      count(distinct date_trunc('day', se.created_at))::int as visit_days,
      max(se.created_at) as last_visit, min(se.created_at) as first_visit,
      (select count(*)::int from rewards r where r.business_id = ${businessId} and r.customer_id = u.id and r.status = 'redeemed') as redeemed,
      (select status::text from marketing_consents mc where mc.business_id = ${businessId} and mc.customer_id = u.id) as consent
    from stamp_events se join users u on u.id = se.customer_id
    where se.business_id = ${businessId}
    group by u.id order by max(se.created_at) desc limit 200`);
  return rows.map((r) => {
    const parts = String(r.name ?? "").trim().split(/\s+/);
    return {
      id: r.id as string,
      displayName: parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || "Kund:in",
      stampsTotal: n(r.stamps_total),
      visitDays: n(r.visit_days),
      lastVisit: new Date(r.last_visit as string),
      firstVisit: new Date(r.first_visit as string),
      redeemed: n(r.redeemed),
      subscribed: r.consent === "granted",
    };
  });
}
