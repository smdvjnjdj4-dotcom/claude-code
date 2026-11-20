import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import {
  auditLogs,
  businesses,
  businessMembers,
  consentEvents,
  favorites,
  follows,
  marketingConsents,
  notifications,
  pushSubscriptions,
  receipts,
  rewards,
  sessions,
  stampEvents,
  users,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { DomainError } from "@/lib/errors";
import { isValidPoint } from "@/lib/geo";
import { deleteStored } from "@/lib/storage";
import { requireCustomer } from "./access";
import { CATEGORIES } from "./businesses";

/** All stamp cards of a customer (one per program they have collected in). */
export async function myCards(db: DB, customerId: string) {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select p.id as program_id, p.name as program_name, p.stamps_required, p.reward_title, p.color, p.status,
           b.id as business_id, b.slug, b.name as business_name, b.logo_path, b.category,
           count(se.id) filter (where se.consumed_by_reward_id is null and (se.expires_at is null or se.expires_at > now()))::int as progress,
           max(se.created_at) as last_stamp,
           min(se.expires_at) filter (where se.consumed_by_reward_id is null and se.expires_at > now()) as next_expiry,
           (select count(*)::int from rewards r where r.program_id = p.id and r.customer_id = ${customerId} and r.status = 'available') as rewards_available
    from stamp_events se
    join loyalty_programs p on p.id = se.program_id
    join businesses b on b.id = p.business_id
    where se.customer_id = ${customerId}
    group by p.id, b.id
    order by max(se.created_at) desc`);
  return rows.map((r) => ({
    programId: r.program_id as string,
    programName: r.program_name as string,
    stampsRequired: Number(r.stamps_required),
    rewardTitle: r.reward_title as string,
    color: r.color as string,
    programStatus: r.status as string,
    businessId: r.business_id as string,
    slug: r.slug as string,
    businessName: r.business_name as string,
    logoPath: (r.logo_path as string) ?? null,
    category: r.category as string,
    progress: Number(r.progress),
    lastStamp: r.last_stamp ? new Date(r.last_stamp as string) : null,
    nextExpiry: r.next_expiry ? new Date(r.next_expiry as string) : null,
    rewardsAvailable: Number(r.rewards_available),
  }));
}

export async function myRewards(db: DB, customerId: string) {
  return db
    .select({ reward: rewards, businessName: businesses.name, slug: businesses.slug, logoPath: businesses.logoPath, category: businesses.category })
    .from(rewards)
    .innerJoin(businesses, eq(businesses.id, rewards.businessId))
    .where(eq(rewards.customerId, customerId))
    .orderBy(sql`case ${rewards.status} when 'available' then 0 else 1 end`, desc(rewards.createdAt))
    .limit(100);
}

export async function getMyReward(db: DB, customerId: string, rewardId: string) {
  const [r] = await db
    .select({ reward: rewards, businessName: businesses.name, slug: businesses.slug, logoPath: businesses.logoPath, category: businesses.category })
    .from(rewards)
    .innerJoin(businesses, eq(businesses.id, rewards.businessId))
    .where(and(eq(rewards.id, rewardId), eq(rewards.customerId, customerId)));
  return r ?? null;
}

/** Unified activity timeline: stamps, rewards, receipts. */
export async function myActivity(db: DB, customerId: string, limit = 50) {
  const rows = await db.execute<Record<string, unknown>>(sql`
    (select 'stamp' as kind, se.created_at as at, b.name as business, b.slug, se.source::text as detail, null::text as status
       from stamp_events se join businesses b on b.id = se.business_id where se.customer_id = ${customerId})
    union all
    (select 'reward', r.created_at, b.name, b.slug, r.title, r.status::text
       from rewards r join businesses b on b.id = r.business_id where r.customer_id = ${customerId})
    union all
    (select 'reward_redeemed', r.redeemed_at, b.name, b.slug, r.title, null
       from rewards r join businesses b on b.id = r.business_id where r.customer_id = ${customerId} and r.redeemed_at is not null)
    union all
    (select 'receipt', rc.created_at, b.name, b.slug, rc.decision_note, rc.status::text
       from receipts rc join businesses b on b.id = rc.business_id where rc.customer_id = ${customerId})
    order by at desc limit ${limit}`);
  return rows.map((r) => ({
    kind: r.kind as "stamp" | "reward" | "reward_redeemed" | "receipt",
    at: new Date(r.at as string),
    business: r.business as string,
    slug: r.slug as string,
    detail: (r.detail as string) ?? null,
    status: (r.status as string) ?? null,
  }));
}

export async function myNotifications(db: DB, userId: string) {
  return db
    .select({ n: notifications, businessName: businesses.name, logoPath: businesses.logoPath })
    .from(notifications)
    .leftJoin(businesses, eq(businesses.id, notifications.businessId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
}

export async function unreadCount(db: DB, userId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(r?.n ?? 0);
}

export async function markAllRead(db: DB, userId: string) {
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/** Businesses a customer has a relationship with, plus consent state (for the privacy center). */
export async function myBusinessRelations(db: DB, customerId: string) {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select b.id, b.name, b.slug, b.logo_path, b.category,
      exists(select 1 from favorites f where f.business_id = b.id and f.customer_id = ${customerId}) as favorite,
      exists(select 1 from follows f where f.business_id = b.id and f.customer_id = ${customerId}) as following,
      (select status::text from marketing_consents mc where mc.business_id = b.id and mc.customer_id = ${customerId}) as consent
    from businesses b
    where b.id in (
      select business_id from favorites where customer_id = ${customerId}
      union select business_id from follows where customer_id = ${customerId}
      union select business_id from marketing_consents where customer_id = ${customerId}
      union select business_id from stamp_events where customer_id = ${customerId})
    order by b.name`);
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    logoPath: (r.logo_path as string) ?? null,
    category: r.category as string,
    favorite: Boolean(r.favorite),
    following: Boolean(r.following),
    consent: r.consent === "granted",
  }));
}

export const profileInput = z.object({
  name: z.string().trim().min(2).max(80),
  interests: z.array(z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]])).max(11).default([]),
  birthday: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  birthdayConsent: z.boolean().default(false),
  transactionalPush: z.boolean().default(true),
  marketingPaused: z.boolean().default(false),
});

export async function updateProfile(db: DB, userId: string, input: z.input<typeof profileInput>) {
  const v = profileInput.parse(input);
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new DomainError("not_found", "Konto nicht gefunden.");
  // Birthday is only stored together with explicit consent; withdrawing consent deletes it.
  const keepBirthday = v.birthday && v.birthdayConsent;
  await db
    .update(users)
    .set({
      name: v.name,
      interests: u.accountType === "customer" ? v.interests : [],
      birthday: keepBirthday ? v.birthday : null,
      birthdayConsentAt: keepBirthday ? (u.birthdayConsentAt ?? new Date()) : null,
      transactionalPush: v.transactionalPush,
      marketingPaused: v.marketingPaused,
    })
    .where(eq(users.id, userId));
  if (Boolean(u.birthdayConsentAt) !== Boolean(keepBirthday)) {
    await audit(db, { actorId: userId, action: keepBirthday ? "consent.birthday_granted" : "consent.birthday_withdrawn" });
  }
}

export async function setHomeLocation(db: DB, userId: string, loc: { label: string; lat: number; lng: number } | null) {
  if (loc && !isValidPoint(loc.lat, loc.lng)) throw new DomainError("invalid_location", "Ungültiger Standort.");
  await db
    .update(users)
    .set(loc ? { homeLabel: loc.label.slice(0, 80), homeLat: loc.lat, homeLng: loc.lng } : { homeLabel: null, homeLat: null, homeLng: null })
    .where(eq(users.id, userId));
}

export async function savePushSubscription(db: DB, userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const parsed = z
    .object({ endpoint: z.string().url().startsWith("https://").max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) })
    .parse(sub);
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: parsed.endpoint, p256dh: parsed.keys.p256dh, auth: parsed.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: parsed.keys.p256dh, auth: parsed.keys.auth, failures: 0 } });
}

export async function removePushSubscription(db: DB, userId: string, endpoint: string) {
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

/* ─────────────────────────── GDPR ─────────────────────────── */

/** Art. 15/20 DSGVO: machine-readable export of all personal data. */
export async function exportPersonalData(db: DB, userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new DomainError("not_found", "Konto nicht gefunden.");
  const { passwordHash: _ph, ...profile } = u;
  const [stamps, rw, rc, fav, fol, cons, consLog, notif, subs, memberships, log] = await Promise.all([
    db.select().from(stampEvents).where(eq(stampEvents.customerId, userId)),
    db.select().from(rewards).where(eq(rewards.customerId, userId)),
    db
      .select({
        id: receipts.id, businessId: receipts.businessId, status: receipts.status, detectedDate: receipts.detectedDate,
        detectedAmountCents: receipts.detectedAmountCents, decisionNote: receipts.decisionNote, createdAt: receipts.createdAt,
        imageStored: sql<boolean>`${receipts.imagePath} is not null`,
      })
      .from(receipts)
      .where(eq(receipts.customerId, userId)),
    db.select().from(favorites).where(eq(favorites.customerId, userId)),
    db.select().from(follows).where(eq(follows.customerId, userId)),
    db.select().from(marketingConsents).where(eq(marketingConsents.customerId, userId)),
    db.select().from(consentEvents).where(eq(consentEvents.customerId, userId)),
    db.select().from(notifications).where(eq(notifications.userId, userId)),
    db.select({ endpointHost: sql<string>`split_part(${pushSubscriptions.endpoint}, '/', 3)`, createdAt: pushSubscriptions.createdAt }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
    db.select().from(businessMembers).where(eq(businessMembers.userId, userId)),
    db.select({ action: auditLogs.action, createdAt: auditLogs.createdAt }).from(auditLogs).where(eq(auditLogs.actorId, userId)),
  ]);
  await audit(db, { actorId: userId, action: "gdpr.exported" });
  return {
    exportedAt: new Date().toISOString(),
    notice: "Datenexport gemäß Art. 15 und Art. 20 DSGVO. Kassenbon-Bilder sind nicht enthalten und werden nach Ablauf der Aufbewahrungsfrist automatisch gelöscht.",
    profile,
    stampEvents: stamps,
    rewards: rw,
    receipts: rc,
    favorites: fav,
    follows: fol,
    marketingConsents: cons,
    consentHistory: consLog,
    notifications: notif,
    pushDevices: subs,
    businessMemberships: memberships,
    securityLog: log,
  };
}

/**
 * Art. 17 DSGVO: deletes the account. Stamp history stays only in anonymised form
 * (customer reference removed) so businesses keep correct aggregate statistics.
 * Business owners must first delete or hand over businesses where they are the only owner.
 */
export async function deleteAccount(db: DB, userId: string, password: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) throw new DomainError("not_found", "Konto nicht gefunden.");
  if (!(await verifyPassword(password, u.passwordHash))) throw new DomainError("invalid_credentials", "Das Passwort ist falsch.");

  const owned = await db.execute<{ business_id: string; name: string; owners: number }>(sql`
    select m.business_id, b.name, (select count(*)::int from business_members m2 where m2.business_id = m.business_id and m2.role = 'owner') as owners
    from business_members m join businesses b on b.id = m.business_id
    where m.user_id = ${userId} and m.role = 'owner'`);
  const soleOwned = owned.filter((o) => Number(o.owners) <= 1);
  if (soleOwned.length) {
    throw new DomainError(
      "sole_owner",
      `Du bist alleinige:r Inhaber:in von „${soleOwned.map((o) => o.name).join("“, „")}“. Bitte lösche zuerst das Unternehmen in den Einstellungen.`,
    );
  }

  const imgs = await db.select({ p: receipts.imagePath }).from(receipts).where(eq(receipts.customerId, userId));
  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(receipts).where(eq(receipts.customerId, userId));
    await audit(tx, { actorId: null, action: "gdpr.account_deleted", meta: { accountType: u.accountType } });
    await tx.delete(users).where(eq(users.id, userId)); // cascades; stamp_events/rewards → customer_id = null
  });
  for (const i of imgs) await deleteStored(i.p);
  await deleteStored(u.avatarPath);
}

/** Owner deletes a whole business (all data cascades). */
export async function deleteBusiness(db: DB, actorId: string, businessId: string, confirmName: string) {
  const [m] = await db
    .select({ role: businessMembers.role, name: businesses.name })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, actorId)));
  if (!m || m.role !== "owner") throw new DomainError("forbidden", "Nur Inhaber:innen können das Unternehmen löschen.");
  if (confirmName.trim() !== m.name) throw new DomainError("confirm_mismatch", "Der eingegebene Name stimmt nicht überein.");
  const imgs = await db.select({ p: receipts.imagePath }).from(receipts).where(eq(receipts.businessId, businessId));
  await db.delete(businesses).where(eq(businesses.id, businessId));
  for (const i of imgs) await deleteStored(i.p);
  await audit(db, { actorId, action: "business.deleted", meta: { name: m.name } });
}

export { requireCustomer };
