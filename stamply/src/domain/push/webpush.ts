import { eq, sql } from "drizzle-orm";
import webpush from "web-push";
import type { Tx } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { env } from "@/lib/env";

let configured = false;
function ensureConfigured() {
  const v = env.vapid;
  if (!v.configured) return false;
  if (!configured) {
    webpush.setVapidDetails(v.subject, v.publicKey, v.privateKey);
    configured = true;
  }
  return true;
}

export type PushPayload = { title: string; body: string; url?: string | null; image?: string | null; tag?: string };

/**
 * Sends a Web Push message to all of a user's registered devices.
 * Returns the number of successful deliveries. Without VAPID keys this is a no-op (in-app inbox only).
 */
export async function sendWebPush(db: Tx, userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: "normal" },
        );
        sent++;
        if (s.failures > 0) await db.update(pushSubscriptions).set({ failures: 0 }).where(eq(pushSubscriptions.id, s.id));
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription expired or revoked by the browser.
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        } else {
          await db
            .update(pushSubscriptions)
            .set({ failures: sql`${pushSubscriptions.failures} + 1` })
            .where(eq(pushSubscriptions.id, s.id));
        }
      }
    }),
  );
  return sent;
}
