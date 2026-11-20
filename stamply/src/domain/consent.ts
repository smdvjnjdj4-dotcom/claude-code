import { and, eq } from "drizzle-orm";
import type { DB, Tx } from "@/db";
import { businesses, consentEvents, marketingConsents } from "@/db/schema";
import { audit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { requireCustomer } from "./access";

export const CONSENT_TEXT_VERSION = "2026-11-v1";

export function consentText(businessName: string) {
  return `Ich möchte von ${businessName} über STAMPLY Push-Nachrichten zu Aktionen, Angeboten und meinen Belohnungen erhalten. Ich kann diese Einwilligung jederzeit in der App widerrufen.`;
}

/** Explicit opt-in / opt-out per business. Each change is appended to an immutable consent log. */
export async function setMarketingConsent(
  db: DB,
  customerId: string,
  businessId: string,
  granted: boolean,
  source: string,
) {
  await requireCustomer(db, customerId);
  const [b] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, businessId));
  if (!b) throw new DomainError("not_found", "Unternehmen nicht gefunden.");
  const status = granted ? "granted" : "withdrawn";
  await db.transaction(async (tx) => {
    await tx
      .insert(marketingConsents)
      .values({ customerId, businessId, status, textVersion: CONSENT_TEXT_VERSION })
      .onConflictDoUpdate({
        target: [marketingConsents.customerId, marketingConsents.businessId],
        set: { status, textVersion: CONSENT_TEXT_VERSION, updatedAt: new Date() },
      });
    await tx.insert(consentEvents).values({ customerId, businessId, status, textVersion: CONSENT_TEXT_VERSION, source });
    await audit(tx, { actorId: customerId, businessId, action: granted ? "consent.granted" : "consent.withdrawn", meta: { source } });
  });
}

export async function hasMarketingConsent(db: Tx, customerId: string, businessId: string) {
  const [c] = await db
    .select({ status: marketingConsents.status })
    .from(marketingConsents)
    .where(and(eq(marketingConsents.customerId, customerId), eq(marketingConsents.businessId, businessId)));
  return c?.status === "granted";
}
