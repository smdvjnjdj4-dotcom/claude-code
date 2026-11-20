import { and, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import {
  businesses,
  businessImages,
  favorites,
  follows,
  loyaltyPrograms,
  marketingConsents,
  offers,
  profileViews,
} from "@/db/schema";
import { hmac } from "@/lib/crypto";
import { localDate } from "@/lib/time";
import { requireCustomer } from "./access";
import { listLocations } from "./businesses";

export type DiscoverSort = "relevance" | "distance" | "popular" | "new";

export type DiscoverOptions = {
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  category?: string | null;
  q?: string | null;
  sort?: DiscoverSort;
  limit?: number;
  customerId?: string | null;
  interests?: string[];
  onlyWithRewards?: boolean;
  onlyNew?: boolean;
  onlyFavorites?: boolean;
};

export type DiscoverRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  logoPath: string | null;
  coverPath: string | null;
  isDemo: boolean;
  isNew: boolean;
  city: string | null;
  street: string | null;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  programId: string | null;
  programName: string | null;
  stampsRequired: number | null;
  rewardTitle: string | null;
  color: string | null;
  popularity: number;
  offerTitle: string | null;
  offerNewCustomers: boolean;
  progress: number | null;
  isFavorite: boolean;
};

const NEW_DAYS = 45;

/**
 * Discovery ranking is based only on relevance signals (distance, category match, real activity).
 * The subscription plan is deliberately NOT a ranking factor – visibility cannot be bought.
 * (Future sponsored placements must be rendered separately and labelled "Anzeige".)
 */
export async function discover(db: DB, o: DiscoverOptions = {}): Promise<DiscoverRow[]> {
  const hasPoint = typeof o.lat === "number" && typeof o.lng === "number";
  const lat = o.lat ?? 0;
  const lng = o.lng ?? 0;
  const dist = (alias: string) =>
    sql.raw(`6371000 * 2 * asin(least(1, sqrt(power(sin(radians(${alias}.lat - ${Number(lat)}) / 2), 2) + cos(radians(${Number(lat)})) * cos(radians(${alias}.lat)) * power(sin(radians(${alias}.lng - ${Number(lng)}) / 2), 2))))`);
  const customer = o.customerId ?? null;
  const q = o.q?.trim() ? `%${o.q.trim().replace(/[%_\\]/g, (m) => "\\" + m)}%` : null;
  const sort = o.sort ?? "relevance";
  const interests = o.interests?.length ? o.interests.filter((i) => /^[a-z]+$/.test(i)).join(",") : null;

  const order =
    sort === "popular" ? sql`popularity desc, created_at desc`
    : sort === "new" ? sql`created_at desc`
    : sort === "distance" && hasPoint ? sql`distance_m asc nulls last`
    : hasPoint
      ? sql`(case when ${interests}::text is not null and category = any(string_to_array(${interests}::text, ',')) then 0 else 1 end),
            distance_m / (1 + ln(1 + popularity)) asc nulls last`
      : sql`(case when ${interests}::text is not null and category = any(string_to_array(${interests}::text, ',')) then 0 else 1 end), popularity desc, created_at desc`;

  const rows = await db.execute(sql`
    select * from (
      select b.id, b.slug, b.name, b.category, b.description, b.logo_path, b.cover_path, b.is_demo, b.created_at,
        (b.created_at > now() - make_interval(days => ${NEW_DAYS})) as is_new,
        l.city, l.street, l.lat, l.lng,
        ${hasPoint ? sql`case when l.lat is null then null else ${dist("l")} end` : sql`null::float8`} as distance_m,
        p.id as program_id, p.name as program_name, p.stamps_required, p.reward_title, p.color,
        (select count(distinct se.customer_id)::int from stamp_events se
           where se.business_id = b.id and se.created_at > now() - interval '30 days') as popularity,
        o.title as offer_title, coalesce(o.new_customers_only, false) as offer_new_customers,
        ${customer ? sql`(select count(*)::int from stamp_events se where se.program_id = p.id and se.customer_id = ${customer}
                           and se.consumed_by_reward_id is null and (se.expires_at is null or se.expires_at > now()))` : sql`null::int`} as progress,
        ${customer ? sql`exists(select 1 from favorites f where f.business_id = b.id and f.customer_id = ${customer})` : sql`false`} as is_favorite
      from businesses b
      join lateral (
        select * from locations l0 where l0.business_id = b.id
        order by ${hasPoint ? sql`case when l0.lat is null then 1 else 0 end, ${dist("l0")}` : sql`l0.is_primary desc`}, l0.created_at limit 1
      ) l on true
      left join lateral (
        select * from loyalty_programs p0 where p0.business_id = b.id and p0.status = 'active'
          and (p0.starts_at is null or p0.starts_at <= now()) and (p0.ends_at is null or p0.ends_at > now())
        order by p0.created_at limit 1
      ) p on true
      left join lateral (
        select * from offers o0 where o0.business_id = b.id and o0.active
          and (o0.starts_at is null or o0.starts_at <= now()) and (o0.ends_at is null or o0.ends_at > now())
        order by o0.new_customers_only desc, o0.created_at desc limit 1
      ) o on true
      where b.published = true
        ${o.category ? sql`and b.category = ${o.category}` : sql``}
        ${q ? sql`and (b.name ilike ${q} or b.description ilike ${q} or l.city ilike ${q} or l.street ilike ${q})` : sql``}
        ${o.onlyWithRewards ? sql`and p.id is not null` : sql``}
        ${o.onlyNew ? sql`and b.created_at > now() - make_interval(days => ${NEW_DAYS})` : sql``}
        ${o.onlyFavorites && customer ? sql`and exists(select 1 from favorites f where f.business_id = b.id and f.customer_id = ${customer})` : sql``}
    ) x
    ${hasPoint && o.radiusKm ? sql`where distance_m <= ${o.radiusKm * 1000}` : sql``}
    order by ${order}
    limit ${Math.min(o.limit ?? 30, 100)}`);

  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    category: r.category as string,
    description: r.description as string,
    logoPath: (r.logo_path as string) ?? null,
    coverPath: (r.cover_path as string) ?? null,
    isDemo: Boolean(r.is_demo),
    isNew: Boolean(r.is_new),
    city: (r.city as string) ?? null,
    street: (r.street as string) ?? null,
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    distanceM: r.distance_m == null ? null : Number(r.distance_m),
    programId: (r.program_id as string) ?? null,
    programName: (r.program_name as string) ?? null,
    stampsRequired: r.stamps_required == null ? null : Number(r.stamps_required),
    rewardTitle: (r.reward_title as string) ?? null,
    color: (r.color as string) ?? null,
    popularity: Number(r.popularity ?? 0),
    offerTitle: (r.offer_title as string) ?? null,
    offerNewCustomers: Boolean(r.offer_new_customers),
    progress: r.progress == null ? null : Number(r.progress),
    isFavorite: Boolean(r.is_favorite),
  }));
}

export async function getBusinessPublic(db: DB, slug: string, customerId?: string | null) {
  const [b] = await db.select().from(businesses).where(eq(businesses.slug, slug));
  if (!b || !b.published) return null;
  const [locs, programs, images, activeOffers] = await Promise.all([
    listLocations(db, b.id),
    db
      .select()
      .from(loyaltyPrograms)
      .where(
        and(
          eq(loyaltyPrograms.businessId, b.id),
          eq(loyaltyPrograms.status, "active"),
          sql`(${loyaltyPrograms.startsAt} is null or ${loyaltyPrograms.startsAt} <= now()) and (${loyaltyPrograms.endsAt} is null or ${loyaltyPrograms.endsAt} > now())`,
        ),
      )
      .orderBy(loyaltyPrograms.createdAt),
    db.select().from(businessImages).where(eq(businessImages.businessId, b.id)).orderBy(businessImages.sort),
    db
      .select()
      .from(offers)
      .where(and(eq(offers.businessId, b.id), eq(offers.active, true), sql`(${offers.startsAt} is null or ${offers.startsAt} <= now()) and (${offers.endsAt} is null or ${offers.endsAt} > now())`))
      .orderBy(desc(offers.createdAt)),
  ]);

  let relation = { favorite: false, following: false, consent: false, progress: {} as Record<string, number>, isNewCustomer: true };
  if (customerId) {
    const [fav, fol, con, prog] = await Promise.all([
      db.select().from(favorites).where(and(eq(favorites.customerId, customerId), eq(favorites.businessId, b.id))),
      db.select().from(follows).where(and(eq(follows.customerId, customerId), eq(follows.businessId, b.id))),
      db.select().from(marketingConsents).where(and(eq(marketingConsents.customerId, customerId), eq(marketingConsents.businessId, b.id))),
      db.execute<{ program_id: string; n: number; total: number }>(sql`
        select program_id, count(*) filter (where consumed_by_reward_id is null and (expires_at is null or expires_at > now()))::int as n,
               count(*)::int as total
        from stamp_events where business_id = ${b.id} and customer_id = ${customerId} group by program_id`),
    ]);
    relation = {
      favorite: fav.length > 0,
      following: fol.length > 0,
      consent: con[0]?.status === "granted",
      progress: Object.fromEntries(prog.map((p) => [p.program_id, Number(p.n)])),
      isNewCustomer: prog.length === 0,
    };
  }
  return { business: b, locations: locs, programs, images, offers: activeOffers, relation };
}

/** Privacy-friendly profile view counter: one count per visitor per day, keyed by a daily HMAC. */
export async function recordProfileView(db: DB, businessId: string, visitorId: string) {
  const day = localDate();
  await db
    .insert(profileViews)
    .values({ businessId, day, visitorKey: hmac(`view:${day}:${visitorId}`).slice(0, 32) })
    .onConflictDoNothing();
}

export async function toggleFavorite(db: DB, customerId: string, businessId: string, on: boolean) {
  await requireCustomer(db, customerId);
  if (on) await db.insert(favorites).values({ customerId, businessId }).onConflictDoNothing();
  else await db.delete(favorites).where(and(eq(favorites.customerId, customerId), eq(favorites.businessId, businessId)));
}

export async function toggleFollow(db: DB, customerId: string, businessId: string, on: boolean) {
  await requireCustomer(db, customerId);
  if (on) await db.insert(follows).values({ customerId, businessId }).onConflictDoNothing();
  else await db.delete(follows).where(and(eq(follows.customerId, customerId), eq(follows.businessId, businessId)));
}

/** Rewards that are currently available nearby – used for the "Belohnungen in der Nähe" rail. */
export async function nearbyOffers(db: DB, o: { lat?: number | null; lng?: number | null; limit?: number }) {
  const rows = await discover(db, { lat: o.lat, lng: o.lng, sort: "distance", limit: 40 });
  return rows.filter((r) => r.offerTitle).slice(0, o.limit ?? 10);
}
