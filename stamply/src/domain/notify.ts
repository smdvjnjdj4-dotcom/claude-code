import { eq } from "drizzle-orm";
import type { Tx } from "@/db";
import { notifications, users } from "@/db/schema";
import { sendWebPush } from "./push/webpush";

/**
 * Transactional (service) notification – e.g. "Stempel erhalten", "Belohnung freigeschaltet".
 * These relate to an action the customer took and are not marketing; they never need marketing
 * consent but respect the user's `transactionalPush` switch for device push.
 * Call AFTER the surrounding transaction committed.
 */
export async function notifyUser(
  db: Tx,
  userId: string,
  n: { businessId?: string | null; title: string; body: string; link?: string | null },
) {
  await db.insert(notifications).values({
    userId,
    businessId: n.businessId ?? null,
    kind: "transactional",
    title: n.title,
    body: n.body,
    link: n.link ?? null,
  });
  const [u] = await db.select({ tp: users.transactionalPush }).from(users).where(eq(users.id, userId));
  if (u?.tp) {
    await sendWebPush(db, userId, { title: n.title, body: n.body, url: n.link ?? "/" }).catch((e) =>
      console.error("push failed", e),
    );
  }
}
