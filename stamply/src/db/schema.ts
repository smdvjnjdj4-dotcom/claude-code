import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ─────────────────────────── Enums ─────────────────────────── */

export const accountType = pgEnum("account_type", ["customer", "business"]);
export const memberRole = pgEnum("member_role", ["owner", "manager", "staff"]);
export const plan = pgEnum("plan", ["starter", "business", "premium"]);
export const programStatus = pgEnum("program_status", ["draft", "active", "paused", "archived"]);
export const rewardType = pgEnum("reward_type", [
  "free_product",
  "percent_discount",
  "fixed_discount",
  "free_service",
  "free_upgrade",
  "custom",
]);
export const rewardStatus = pgEnum("reward_status", ["available", "redeemed", "expired"]);
export const stampSource = pgEnum("stamp_source", ["receipt", "code", "manual"]);
export const receiptStatus = pgEnum("receipt_status", [
  "processing",
  "needs_review",
  "approved",
  "rejected",
]);
export const consentStatus = pgEnum("consent_status", ["granted", "withdrawn"]);
export const campaignType = pgEnum("campaign_type", ["manual", "recurring", "trigger"]);
export const campaignTrigger = pgEnum("campaign_trigger", [
  "inactive_days",
  "one_stamp_left",
  "reward_available",
  "birthday",
  "new_program",
]);
export const campaignStatus = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "active",
  "paused",
  "sent",
  "archived",
]);
export const notificationKind = pgEnum("notification_kind", ["transactional", "marketing"]);
export const deliveryStatus = pgEnum("delivery_status", ["sent", "skipped"]);
export const receiptReviewMode = pgEnum("receipt_review_mode", ["auto_low_risk", "always_manual"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const ts = (name: string) => timestamp(name, { withTimezone: true });

/* ─────────────────────────── Users & Auth ─────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    accountType: accountType("account_type").notNull(),
    avatarPath: text("avatar_path"),
    // Optional, nur mit ausdrücklicher Einwilligung (birthdayConsentAt) verarbeitet.
    birthday: date("birthday"),
    birthdayConsentAt: ts("birthday_consent_at"),
    homeLabel: text("home_label"),
    homeLat: doublePrecision("home_lat"),
    homeLng: doublePrecision("home_lng"),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    // Globaler Schalter: pausiert ALLE Marketing-Nachrichten, unabhängig von Einwilligungen.
    marketingPaused: boolean("marketing_paused").notNull().default(false),
    // Transaktionale Push-Nachrichten (Stempel erhalten, Belohnung frei) – vom Nutzer abschaltbar.
    transactionalPush: boolean("transactional_push").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 des Session-Tokens; das Klartext-Token existiert nur im Cookie.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ─────────────────────────── Businesses ─────────────────────────── */

export const businesses = pgTable("businesses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  logoPath: text("logo_path"),
  coverPath: text("cover_path"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  instagram: text("instagram"),
  // Alternative Schreibweisen des Namens auf Kassenbons (für die Bon-Erkennung).
  receiptAliases: text("receipt_aliases").array().notNull().default(sql`'{}'::text[]`),
  receiptReviewMode: receiptReviewMode("receipt_review_mode").notNull().default("auto_low_risk"),
  plan: plan("plan").notNull().default("starter"),
  // Nur "test" ist implementiert – es fließt kein Geld.
  billingMode: text("billing_mode").notNull().default("test"),
  published: boolean("published").notNull().default(false),
  // Seed-/Demo-Daten werden in der Oberfläche als „Demo“ gekennzeichnet.
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export type OpeningHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  { open: string; close: string }[]
>;

export const locations = pgTable(
  "locations",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    street: text("street").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    city: text("city").notNull().default(""),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    openingHours: jsonb("opening_hours").$type<OpeningHours>(),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("locations_business_idx").on(t.businessId)],
);

export const businessImages = pgTable("business_images", {
  id: id(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
});

export const businessMembers = pgTable(
  "business_members",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.userId] }), index("members_user_idx").on(t.userId)],
);

export const businessInvites = pgTable("business_invites", {
  id: id(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: memberRole("role").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: ts("expires_at").notNull(),
  acceptedAt: ts("accepted_at"),
  createdAt: createdAt(),
});

/* ─────────────────────────── Loyalty ─────────────────────────── */

export const loyaltyPrograms = pgTable(
  "loyalty_programs",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    stampsRequired: integer("stamps_required").notNull(),
    rewardType: rewardType("reward_type").notNull(),
    rewardTitle: text("reward_title").notNull(),
    // percent_discount → Prozent (1–100); fixed_discount → Cent; sonst null
    rewardValue: integer("reward_value"),
    minPurchaseCents: integer("min_purchase_cents").notNull().default(0),
    // Gültigkeit eines Stempels in Tagen (null = unbegrenzt)
    stampValidityDays: integer("stamp_validity_days"),
    // Gültigkeit einer freigeschalteten Belohnung in Tagen (null = unbegrenzt)
    rewardValidityDays: integer("reward_validity_days"),
    maxStampsPerDay: integer("max_stamps_per_day").notNull().default(1),
    // null/leer = alle Filialen
    locationIds: uuid("location_ids").array(),
    eligibleItems: text("eligible_items").notNull().default(""),
    redemptionTerms: text("redemption_terms").notNull().default(""),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    color: text("color").notNull().default("#6C47FF"),
    imagePath: text("image_path"),
    status: programStatus("status").notNull().default("draft"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("programs_business_idx").on(t.businessId)],
);

export const receipts = pgTable(
  "receipts",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "cascade" }),
    imagePath: text("image_path"),
    imageSha256: text("image_sha256").notNull(),
    // Normalisierter Fingerabdruck aus Datum/Uhrzeit/Betrag/Bon-Nr. – erkennt dasselbe Papier auf neuem Foto.
    fingerprint: text("fingerprint"),
    ocrText: text("ocr_text"),
    ocrConfidence: integer("ocr_confidence"),
    detectedMerchant: text("detected_merchant"),
    detectedDate: date("detected_date"),
    detectedAmountCents: integer("detected_amount_cents"),
    detectedReceiptNo: text("detected_receipt_no"),
    riskScore: integer("risk_score").notNull().default(0),
    riskFlags: text("risk_flags").array().notNull().default(sql`'{}'::text[]`),
    status: receiptStatus("status").notNull().default("processing"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: ts("decided_at"),
    decisionNote: text("decision_note"),
    imagePurgedAt: ts("image_purged_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("receipts_business_image_unique").on(t.businessId, t.imageSha256),
    index("receipts_business_status_idx").on(t.businessId, t.status),
    index("receipts_fingerprint_idx").on(t.businessId, t.fingerprint),
  ],
);

export const stampCodes = pgTable("stamp_codes", {
  id: id(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  programId: uuid("program_id")
    .notNull()
    .references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  codeHash: text("code_hash").notNull().unique(),
  stamps: integer("stamps").notNull().default(1),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  usedBy: uuid("used_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const rewards = pgTable(
  "rewards",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    rewardType: rewardType("reward_type").notNull(),
    rewardValue: integer("reward_value"),
    // Kurzer Einlösecode, den der Kunde an der Kasse zeigt.
    code: text("code").notNull().unique(),
    status: rewardStatus("status").notNull().default("available"),
    expiresAt: ts("expires_at"),
    redeemedAt: ts("redeemed_at"),
    redeemedBy: uuid("redeemed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("rewards_customer_idx").on(t.customerId), index("rewards_business_idx").on(t.businessId)],
);

export const stampEvents = pgTable(
  "stamp_events",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
    // Bei Kontolöschung anonymisiert (null), damit Unternehmensstatistiken erhalten bleiben.
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    source: stampSource("source").notNull(),
    receiptId: uuid("receipt_id").references(() => receipts.id, { onDelete: "set null" }),
    codeId: uuid("code_id").references(() => stampCodes.id, { onDelete: "set null" }),
    awardedBy: uuid("awarded_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: ts("expires_at"),
    consumedByRewardId: uuid("consumed_by_reward_id").references(() => rewards.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    // Ein Beleg / ein Code kann höchstens einen Stempel-Datensatz erzeugen.
    uniqueIndex("stamp_events_receipt_unique").on(t.receiptId),
    index("stamp_events_card_idx").on(t.programId, t.customerId),
    index("stamp_events_business_time_idx").on(t.businessId, t.createdAt),
  ],
);

export const offers = pgTable("offers", {
  id: id(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  newCustomersOnly: boolean("new_customers_only").notNull().default(false),
  startsAt: ts("starts_at"),
  endsAt: ts("ends_at"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/* ─────────────────────────── Customer relations ─────────────────────────── */

export const favorites = pgTable(
  "favorites",
  {
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.businessId] })],
);

export const follows = pgTable(
  "follows",
  {
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.businessId] })],
);

/** Aktueller Einwilligungsstatus je Kunde × Unternehmen (Marketing-Push). */
export const marketingConsents = pgTable(
  "marketing_consents",
  {
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    status: consentStatus("status").notNull(),
    textVersion: text("text_version").notNull(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.businessId] })],
);

/** Unveränderliches Protokoll aller Einwilligungsänderungen (Nachweis nach Art. 7 Abs. 1 DSGVO). */
export const consentEvents = pgTable("consent_events", {
  id: id(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  status: consentStatus("status").notNull(),
  textVersion: text("text_version").notNull(),
  source: text("source").notNull(),
  createdAt: createdAt(),
});

/* ─────────────────────────── Notifications & Campaigns ─────────────────────────── */

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  failures: integer("failures").notNull().default(0),
  createdAt: createdAt(),
});

export type AudienceSpec = {
  segment:
    | "all_consented"
    | "active_regulars"
    | "inactive_14"
    | "inactive_30"
    | "almost_complete"
    | "reward_available"
    | "new_customers";
  programId?: string | null;
};

export const campaigns = pgTable(
  "campaigns",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: campaignType("type").notNull(),
    trigger: campaignTrigger("trigger"),
    triggerParam: integer("trigger_param"),
    audience: jsonb("audience").$type<AudienceSpec>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    imagePath: text("image_path"),
    link: text("link"),
    scheduledAt: ts("scheduled_at"),
    intervalDays: integer("interval_days"),
    nextRunAt: ts("next_run_at"),
    lastRunAt: ts("last_run_at"),
    status: campaignStatus("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("campaigns_due_idx").on(t.status, t.nextRunAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    kind: notificationKind("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    imagePath: text("image_path"),
    link: text("link"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

/** Versandprotokoll: jede Zustellung UND jede bewusste Nicht-Zustellung mit Grund. */
export const campaignDeliveries = pgTable(
  "campaign_deliveries",
  {
    id: id(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
    // Idempotenzschlüssel pro Lauf/Ereignis (z. B. Datum, Belohnungs-ID, letzter Besuch)
    runKey: text("run_key").notNull(),
    status: deliveryStatus("status").notNull(),
    reason: text("reason"),
    contentHash: text("content_hash").notNull(),
    pushSent: integer("push_sent").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("deliveries_idempotency").on(t.campaignId, t.customerId, t.runKey),
    index("deliveries_customer_time_idx").on(t.customerId, t.createdAt),
  ],
);

/* ─────────────────────────── Analytics, Audit, Infra ─────────────────────────── */

export const profileViews = pgTable(
  "profile_views",
  {
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    // Tagesbezogener HMAC des Besuchers – keine Rückverfolgung über Tage hinweg.
    visitorKey: text("visitor_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.day, t.visitorKey] })],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_business_idx").on(t.businessId, t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: ts("window_start").notNull(),
  count: integer("count").notNull(),
});

export const subscriptionEvents = pgTable("subscription_events", {
  id: id(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  fromPlan: plan("from_plan"),
  toPlan: plan("to_plan").notNull(),
  mode: text("mode").notNull(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type LoyaltyProgram = typeof loyaltyPrograms.$inferSelect;
export type Reward = typeof rewards.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type MemberRole = (typeof memberRole.enumValues)[number];
export type Plan = (typeof plan.enumValues)[number];
export type RewardType = (typeof rewardType.enumValues)[number];
