/**
 * Anti-spam policy for MARKETING messages. Pure and deterministic, so it can be unit-tested.
 * Every marketing delivery passes through `evaluateMarketingSend` right before sending,
 * which means a withdrawn consent takes effect immediately for all scheduled/automated campaigns.
 */

export const POLICY = {
  /** Minimum gap between two marketing messages from the SAME business to one customer. */
  minHoursBetweenSameBusiness: 48,
  /** Max marketing messages from the same business per customer in 7 days. */
  maxPerBusinessPer7Days: 3,
  /** Max marketing messages from ALL businesses together per customer in 24 hours. */
  maxPlatformPer24h: 3,
  /** Identical content is never sent twice to the same customer within this window. */
  duplicateContentWindowDays: 14,
} as const;

export type RecentDelivery = { businessId: string; contentHash: string; at: Date };

export type SendContext = {
  now: Date;
  businessId: string;
  contentHash: string;
  consentGranted: boolean;
  userMarketingPaused: boolean;
  quietHours: boolean;
  recent: RecentDelivery[]; // sent deliveries to this customer within the last 14 days
};

export type SkipReason =
  | "no_consent"
  | "user_paused"
  | "quiet_hours"
  | "duplicate_content"
  | "business_min_gap"
  | "business_weekly_cap"
  | "platform_daily_cap";

export const SKIP_LABELS: Record<SkipReason, string> = {
  no_consent: "Keine Einwilligung",
  user_paused: "Kunde hat Marketing pausiert",
  quiet_hours: "Ruhezeit",
  duplicate_content: "Identische Nachricht kürzlich erhalten",
  business_min_gap: "Mindestabstand zu letzter Nachricht",
  business_weekly_cap: "Wochenlimit dieses Unternehmens erreicht",
  platform_daily_cap: "Tageslimit der Plattform erreicht",
};

export function evaluateMarketingSend(c: SendContext): { ok: true } | { ok: false; reason: SkipReason } {
  if (!c.consentGranted) return { ok: false, reason: "no_consent" };
  if (c.userMarketingPaused) return { ok: false, reason: "user_paused" };
  if (c.quietHours) return { ok: false, reason: "quiet_hours" };
  const t = c.now.getTime();
  const within = (d: RecentDelivery, hours: number) => t - d.at.getTime() < hours * 3600_000;

  if (c.recent.some((d) => d.contentHash === c.contentHash && within(d, POLICY.duplicateContentWindowDays * 24))) {
    return { ok: false, reason: "duplicate_content" };
  }
  const sameBiz = c.recent.filter((d) => d.businessId === c.businessId);
  if (sameBiz.some((d) => within(d, POLICY.minHoursBetweenSameBusiness))) return { ok: false, reason: "business_min_gap" };
  if (sameBiz.filter((d) => within(d, 24 * 7)).length >= POLICY.maxPerBusinessPer7Days) {
    return { ok: false, reason: "business_weekly_cap" };
  }
  if (c.recent.filter((d) => within(d, 24)).length >= POLICY.maxPlatformPer24h) {
    return { ok: false, reason: "platform_daily_cap" };
  }
  return { ok: true };
}

/** Allowed in-app link targets for campaigns (no external redirects / phishing). */
export function sanitizeInternalLink(link: string | null | undefined): string | null {
  if (!link) return null;
  const l = link.trim();
  if (!/^\/(?!\/)[A-Za-z0-9\-._~/?=&%#]*$/.test(l)) return null;
  return l.slice(0, 300);
}

/** Replaces {vorname} with the customer's first name. */
export function personalize(template: string, name: string | null | undefined) {
  const first = (name ?? "").trim().split(/\s+/)[0] || "du";
  return template.replace(/\{vorname\}/gi, first);
}
