import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "@/db";
import {
  businesses,
  businessImages,
  businessInvites,
  businessMembers,
  locations,
  subscriptionEvents,
  users,
  type OpeningHours,
  type Plan,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/crypto";
import { DomainError } from "@/lib/errors";
import { isValidPoint } from "@/lib/geo";
import { entitlements } from "@/lib/plans";
import { deleteStored } from "@/lib/storage";
import { requireMember } from "./access";

export const CATEGORIES = [
  { id: "cafe", label: "Café", emoji: "☕" },
  { id: "restaurant", label: "Restaurant", emoji: "🍝" },
  { id: "bakery", label: "Bäckerei", emoji: "🥐" },
  { id: "barber", label: "Barber", emoji: "💈" },
  { id: "hair", label: "Friseur", emoji: "✂️" },
  { id: "nails", label: "Nagelstudio", emoji: "💅" },
  { id: "beauty", label: "Beauty & Kosmetik", emoji: "🌸" },
  { id: "fitness", label: "Fitness & Yoga", emoji: "🧘" },
  { id: "icecream", label: "Eis & Dessert", emoji: "🍦" },
  { id: "shop", label: "Laden", emoji: "🛍️" },
  { id: "other", label: "Sonstiges", emoji: "✨" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "Sonstiges";
export const categoryEmoji = (id: string) => CATEGORIES.find((c) => c.id === id)?.emoji ?? "✨";

const categoryIds = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "unternehmen"
  );
}

async function uniqueSlug(db: DB, base: string) {
  let slug = slugify(base);
  for (let i = 2; ; i++) {
    const [hit] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, slug));
    if (!hit) return slug;
    slug = `${slugify(base)}-${i}`;
  }
}

const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine((v) => v === null || /^https:\/\/[^\s]+$/i.test(v), "Bitte eine https://-Adresse angeben.");

export const businessProfileInput = z.object({
  name: z.string().trim().min(2, "Bitte gib den Namen an.").max(80),
  category: z.enum(categoryIds),
  description: z.string().trim().max(1200).default(""),
  phone: z.string().trim().max(40).transform((v) => v || null).nullable().default(null),
  email: z.string().trim().max(200).transform((v) => v || null).nullable().default(null)
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Ungültige E-Mail-Adresse."),
  website: optionalUrl.default(null),
  instagram: z.string().trim().max(60).transform((v) => v.replace(/^@/, "") || null).nullable().default(null),
  receiptAliases: z.array(z.string().trim().min(2).max(60)).max(5).default([]),
  receiptReviewMode: z.enum(["auto_low_risk", "always_manual"]).default("auto_low_risk"),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const openingHoursSchema = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.array(z.object({ open: hhmm, close: hhmm })).max(3),
);

export const locationInput = z.object({
  name: z.string().trim().min(2).max(80),
  street: z.string().trim().max(120).default(""),
  postalCode: z.string().trim().max(12).default(""),
  city: z.string().trim().max(80).default(""),
  lat: z.coerce.number().nullable().default(null),
  lng: z.coerce.number().nullable().default(null),
  openingHours: openingHoursSchema.nullable().default(null),
});

/** Onboarding: a business account creates its company and becomes its owner. */
export async function createBusiness(
  db: DB,
  userId: string,
  input: { name: string; category: string; location: z.input<typeof locationInput> },
) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.accountType !== "business") {
    throw new DomainError("forbidden", "Nur Unternehmenskonten können ein Unternehmen anlegen.");
  }
  const profile = businessProfileInput.pick({ name: true, category: true }).parse(input);
  const loc = locationInput.parse(input.location);
  if ((loc.lat !== null || loc.lng !== null) && !isValidPoint(loc.lat, loc.lng)) {
    throw new DomainError("invalid_location", "Ungültige Koordinaten.");
  }
  const slug = await uniqueSlug(db, profile.name);
  return db.transaction(async (tx) => {
    const [b] = await tx.insert(businesses).values({ ...profile, slug }).returning();
    await tx.insert(businessMembers).values({ businessId: b.id, userId, role: "owner" });
    await tx.insert(locations).values({ ...loc, openingHours: loc.openingHours as OpeningHours | null, businessId: b.id, isPrimary: true });
    await tx.insert(subscriptionEvents).values({ businessId: b.id, fromPlan: null, toPlan: "starter", mode: "test", actorId: userId });
    await audit(tx, { actorId: userId, businessId: b.id, action: "business.created" });
    return b;
  });
}

export async function updateBusinessProfile(db: DB, actorId: string, businessId: string, input: z.input<typeof businessProfileInput>) {
  await requireMember(db, actorId, businessId, "business.edit");
  const data = businessProfileInput.parse(input);
  const [b] = await db.update(businesses).set(data).where(eq(businesses.id, businessId)).returning();
  await audit(db, { actorId, businessId, action: "business.updated" });
  return b;
}

export async function setBusinessImage(db: DB, actorId: string, businessId: string, kind: "logo" | "cover", key: string) {
  const ctx = await requireMember(db, actorId, businessId, "business.edit");
  const old = kind === "logo" ? ctx.business.logoPath : ctx.business.coverPath;
  await db.update(businesses).set(kind === "logo" ? { logoPath: key } : { coverPath: key }).where(eq(businesses.id, businessId));
  await deleteStored(old);
}

export async function addGalleryImage(db: DB, actorId: string, businessId: string, key: string) {
  await requireMember(db, actorId, businessId, "business.edit");
  const [{ n }] = await db.select({ n: count() }).from(businessImages).where(eq(businessImages.businessId, businessId));
  if (n >= 12) throw new DomainError("limit", "Maximal 12 Bilder pro Unternehmen.");
  await db.insert(businessImages).values({ businessId, path: key, sort: n });
}

export async function removeGalleryImage(db: DB, actorId: string, businessId: string, imageId: string) {
  await requireMember(db, actorId, businessId, "business.edit");
  const [img] = await db
    .delete(businessImages)
    .where(and(eq(businessImages.id, imageId), eq(businessImages.businessId, businessId)))
    .returning();
  if (img) await deleteStored(img.path);
}

/** Publishing makes the profile discoverable. Requires a location with coordinates and a live program. */
export async function setPublished(db: DB, actorId: string, businessId: string, published: boolean) {
  await requireMember(db, actorId, businessId, "business.edit");
  if (published) {
    const [loc] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.businessId, businessId), sql`${locations.lat} is not null`))
      .limit(1);
    if (!loc) throw new DomainError("incomplete", "Bitte hinterlege zuerst einen Standort mit Kartenposition.");
  }
  await db.update(businesses).set({ published }).where(eq(businesses.id, businessId));
  await audit(db, { actorId, businessId, action: published ? "business.published" : "business.unpublished" });
}

/* ─────────────────────────── Locations ─────────────────────────── */

export async function upsertLocation(
  db: DB,
  actorId: string,
  businessId: string,
  input: z.input<typeof locationInput>,
  locationId?: string,
) {
  const ctx = await requireMember(db, actorId, businessId, "business.edit");
  const data = locationInput.parse(input);
  if ((data.lat !== null || data.lng !== null) && !isValidPoint(data.lat, data.lng)) {
    throw new DomainError("invalid_location", "Ungültige Koordinaten.");
  }
  const values = { ...data, openingHours: data.openingHours as OpeningHours | null };
  if (locationId) {
    const [l] = await db
      .update(locations)
      .set(values)
      .where(and(eq(locations.id, locationId), eq(locations.businessId, businessId)))
      .returning();
    if (!l) throw new DomainError("not_found", "Standort nicht gefunden.");
    return l;
  }
  const [{ n }] = await db.select({ n: count() }).from(locations).where(eq(locations.businessId, businessId));
  if (n >= entitlements(ctx.business.plan).maxLocations) {
    throw new DomainError("plan_required", "Weitere Standorte sind im Premium-Tarif verfügbar.");
  }
  const [l] = await db.insert(locations).values({ ...values, businessId, isPrimary: n === 0 }).returning();
  await audit(db, { actorId, businessId, action: "location.created", targetId: l.id });
  return l;
}

export async function deleteLocation(db: DB, actorId: string, businessId: string, locationId: string) {
  await requireMember(db, actorId, businessId, "business.edit");
  const [{ n }] = await db.select({ n: count() }).from(locations).where(eq(locations.businessId, businessId));
  if (n <= 1) throw new DomainError("last_location", "Der letzte Standort kann nicht gelöscht werden.");
  await db.delete(locations).where(and(eq(locations.id, locationId), eq(locations.businessId, businessId)));
}

export async function listLocations(db: DB, businessId: string) {
  return db.select().from(locations).where(eq(locations.businessId, businessId)).orderBy(sql`${locations.isPrimary} desc`, asc(locations.createdAt));
}

/* ─────────────────────────── Team ─────────────────────────── */

export const INVITE_TTL_DAYS = 7;

export async function listTeam(db: DB, actorId: string, businessId: string) {
  await requireMember(db, actorId, businessId);
  const members = await db
    .select({ userId: users.id, name: users.name, email: users.email, role: businessMembers.role, since: businessMembers.createdAt })
    .from(businessMembers)
    .innerJoin(users, eq(users.id, businessMembers.userId))
    .where(eq(businessMembers.businessId, businessId))
    .orderBy(asc(businessMembers.createdAt));
  const invites = await db
    .select()
    .from(businessInvites)
    .where(and(eq(businessInvites.businessId, businessId), sql`${businessInvites.acceptedAt} is null and ${businessInvites.expiresAt} > now()`));
  return { members, invites };
}

/** Creates an invite link (shown to the owner to share – no e-mail service required). */
export async function inviteMember(db: DB, actorId: string, businessId: string, email: string, role: "manager" | "staff") {
  const ctx = await requireMember(db, actorId, businessId, "team.manage");
  const parsed = z.string().trim().toLowerCase().email("Ungültige E-Mail-Adresse.").parse(email);
  const [{ n }] = await db.select({ n: count() }).from(businessMembers).where(eq(businessMembers.businessId, businessId));
  if (n >= entitlements(ctx.business.plan).maxMembers) {
    throw new DomainError("plan_required", "Die Teamgröße deines Tarifs ist erreicht. Mehr Mitarbeiter:innen gibt es im höheren Tarif.");
  }
  const token = randomToken(24);
  await db.insert(businessInvites).values({
    businessId,
    email: parsed,
    role,
    tokenHash: sha256(token),
    invitedBy: actorId,
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86400_000),
  });
  await audit(db, { actorId, businessId, action: "team.invited", meta: { role } });
  return { token };
}

export async function getInvite(db: DB, token: string) {
  const [inv] = await db
    .select({ invite: businessInvites, businessName: businesses.name })
    .from(businessInvites)
    .innerJoin(businesses, eq(businesses.id, businessInvites.businessId))
    .where(eq(businessInvites.tokenHash, sha256(token)));
  if (!inv || inv.invite.acceptedAt || inv.invite.expiresAt < new Date()) return null;
  return inv;
}

export async function acceptInvite(db: DB, userId: string, token: string) {
  const inv = await getInvite(db, token);
  if (!inv) throw new DomainError("invalid_invite", "Die Einladung ist ungültig oder abgelaufen.");
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.accountType !== "business") throw new DomainError("forbidden", "Bitte melde dich mit einem Unternehmenskonto an.");
  if (u.email.toLowerCase() !== inv.invite.email.toLowerCase()) {
    throw new DomainError("email_mismatch", `Diese Einladung gilt für ${inv.invite.email}.`);
  }
  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(businessInvites)
      .set({ acceptedAt: new Date() })
      .where(and(eq(businessInvites.id, inv.invite.id), sql`${businessInvites.acceptedAt} is null`))
      .returning();
    if (!claimed.length) throw new DomainError("invalid_invite", "Die Einladung wurde bereits verwendet.");
    await tx
      .insert(businessMembers)
      .values({ businessId: inv.invite.businessId, userId, role: inv.invite.role })
      .onConflictDoNothing();
    await audit(tx, { actorId: userId, businessId: inv.invite.businessId, action: "team.joined", meta: { role: inv.invite.role } });
  });
  return inv.invite.businessId;
}

export async function changeMemberRole(db: DB, actorId: string, businessId: string, userId: string, role: "manager" | "staff") {
  await requireMember(db, actorId, businessId, "team.manage");
  const target = await requireMember(db, userId, businessId);
  if (target.role === "owner") throw new DomainError("forbidden", "Die Rolle der Inhaberin/des Inhabers kann nicht geändert werden.");
  await db.update(businessMembers).set({ role }).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId)));
  await audit(db, { actorId, businessId, action: "team.role_changed", targetId: userId, meta: { role } });
}

export async function removeMember(db: DB, actorId: string, businessId: string, userId: string) {
  await requireMember(db, actorId, businessId, "team.manage");
  const target = await requireMember(db, userId, businessId);
  if (target.role === "owner") throw new DomainError("forbidden", "Inhaber:innen können nicht entfernt werden.");
  await db.delete(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId)));
  await audit(db, { actorId, businessId, action: "team.removed", targetId: userId });
}

export async function revokeInvite(db: DB, actorId: string, businessId: string, inviteId: string) {
  await requireMember(db, actorId, businessId, "team.manage");
  await db.delete(businessInvites).where(and(eq(businessInvites.id, inviteId), eq(businessInvites.businessId, businessId)));
}

/* ─────────────────────────── Billing (TEST MODE ONLY) ─────────────────────────── */

/**
 * Changes the plan in TEST MODE. No payment is collected or simulated – this only switches
 * entitlements so features can be tried. A real payment provider must be integrated
 * (with the owner's approval) before charging anyone.
 */
export async function changePlanTestMode(db: DB, actorId: string, businessId: string, to: Plan) {
  const ctx = await requireMember(db, actorId, businessId, "billing.manage");
  if (process.env.BILLING_MODE && process.env.BILLING_MODE !== "test") {
    throw new DomainError("billing_unavailable", "Zahlungsabwicklung ist noch nicht eingerichtet.");
  }
  const e = entitlements(to);
  const [{ locs }] = await db.select({ locs: count() }).from(locations).where(eq(locations.businessId, businessId));
  if (locs > e.maxLocations) {
    throw new DomainError("downgrade_blocked", `Der Tarif erlaubt ${e.maxLocations} Standort(e). Bitte entferne zuerst Standorte.`);
  }
  await db.transaction(async (tx) => {
    await tx.update(businesses).set({ plan: to, billingMode: "test" }).where(eq(businesses.id, businessId));
    await tx.insert(subscriptionEvents).values({ businessId, fromPlan: ctx.business.plan, toPlan: to, mode: "test", actorId });
    await audit(tx, { actorId, businessId, action: "billing.plan_changed_test", meta: { from: ctx.business.plan, to } });
  });
}

export async function membershipsForUser(db: DB, userId: string) {
  return db
    .select({ businessId: businesses.id, name: businesses.name, slug: businesses.slug, role: businessMembers.role, plan: businesses.plan, logoPath: businesses.logoPath })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(eq(businessMembers.userId, userId))
    .orderBy(asc(businessMembers.createdAt));
}

export async function otherOwnersCount(db: DB, businessId: string, userId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.role, "owner"), ne(businessMembers.userId, userId)));
  return n;
}
