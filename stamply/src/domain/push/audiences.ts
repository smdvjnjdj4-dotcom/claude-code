import { sql, type SQL } from "drizzle-orm";
import type { Tx } from "@/db";
import type { AudienceSpec } from "@/db/schema";

export const SEGMENTS: { id: AudienceSpec["segment"]; label: string; description: string }[] = [
  { id: "all_consented", label: "Alle Abonnent:innen", description: "Alle Kund:innen, die deine Updates abonniert haben" },
  { id: "active_regulars", label: "Aktive Stammkund:innen", description: "Mind. 3 Stempel in den letzten 60 Tagen" },
  { id: "new_customers", label: "Neue Kund:innen", description: "Erster Stempel in den letzten 30 Tagen" },
  { id: "inactive_14", label: "14 Tage ohne Besuch", description: "Letzter Stempel vor mehr als 14 Tagen" },
  { id: "inactive_30", label: "30 Tage ohne Besuch", description: "Letzter Stempel vor mehr als 30 Tagen" },
  { id: "almost_complete", label: "Fast volle Stempelkarte", description: "Nur noch 1 Stempel bis zur Belohnung" },
  { id: "reward_available", label: "Belohnung wartet", description: "Freigeschaltete, noch nicht eingelöste Belohnung" },
];

/**
 * SQL selecting `customer_id` for a segment of ONE business. Always scoped by business_id –
 * there is no way to target customers of another business.
 */
function segmentQuery(businessId: string, spec: AudienceSpec): SQL {
  const b = businessId;
  switch (spec.segment) {
    case "all_consented":
      return sql`select customer_id from marketing_consents where business_id = ${b} and status = 'granted'`;
    case "active_regulars":
      return sql`select customer_id from stamp_events where business_id = ${b} and customer_id is not null
                 and created_at > now() - interval '60 days' group by customer_id having count(*) >= 3`;
    case "new_customers":
      return sql`select customer_id from stamp_events where business_id = ${b} and customer_id is not null
                 group by customer_id having min(created_at) > now() - interval '30 days'`;
    case "inactive_14":
    case "inactive_30": {
      const days = spec.segment === "inactive_14" ? 14 : 30;
      return sql`select customer_id from stamp_events where business_id = ${b} and customer_id is not null
                 group by customer_id having max(created_at) < now() - make_interval(days => ${days})`;
    }
    case "almost_complete":
      return sql`select se.customer_id from stamp_events se
                 join loyalty_programs p on p.id = se.program_id and p.status = 'active'
                 where se.business_id = ${b} and se.customer_id is not null and se.consumed_by_reward_id is null
                   and (se.expires_at is null or se.expires_at > now())
                   ${spec.programId ? sql`and se.program_id = ${spec.programId}` : sql``}
                 group by se.customer_id, se.program_id, p.stamps_required
                 having count(*) = p.stamps_required - 1 and p.stamps_required > 1`;
    case "reward_available":
      return sql`select customer_id from rewards where business_id = ${b} and status = 'available'
                 and customer_id is not null and (expires_at is null or expires_at > now())
                 ${spec.programId ? sql`and program_id = ${spec.programId}` : sql``}`;
  }
}

/** Customers in the segment who have granted marketing consent to this business. */
export async function resolveAudience(db: Tx, businessId: string, spec: AudienceSpec): Promise<string[]> {
  const rows = await db.execute<{ customer_id: string }>(sql`
    select distinct s.customer_id from (${segmentQuery(businessId, spec)}) s
    join marketing_consents mc on mc.customer_id = s.customer_id and mc.business_id = ${businessId} and mc.status = 'granted'
    join users u on u.id = s.customer_id and u.marketing_paused = false`);
  return rows.map((r) => r.customer_id);
}

/** Segment sizes for the dashboard: total customers in segment vs. reachable (consented). */
export async function segmentCounts(db: Tx, businessId: string) {
  const out: Record<string, { total: number; reachable: number }> = {};
  for (const s of SEGMENTS) {
    const q = segmentQuery(businessId, { segment: s.id });
    const [row] = await db.execute<{ total: number; reachable: number }>(sql`
      select count(distinct s.customer_id)::int as total,
             count(distinct s.customer_id) filter (where mc.status = 'granted' and u.marketing_paused = false)::int as reachable
      from (${q}) s
      left join marketing_consents mc on mc.customer_id = s.customer_id and mc.business_id = ${businessId}
      left join users u on u.id = s.customer_id`);
    out[s.id] = { total: Number(row?.total ?? 0), reachable: Number(row?.reachable ?? 0) };
  }
  return out;
}
