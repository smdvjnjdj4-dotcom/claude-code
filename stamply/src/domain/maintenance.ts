import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import { expireRewards } from "./loyalty";
import { runDueCampaigns } from "./push/dispatch";
import { purgeReceiptImages, retryStuckReceipts } from "./receipts/service";

/** One scheduler tick: campaigns, receipt retries, data retention, housekeeping. */
export async function runMaintenance(db: DB, now = new Date()) {
  const campaigns = await runDueCampaigns(db, now);
  const [retried, purged, expired] = await Promise.all([retryStuckReceipts(db), purgeReceiptImages(db, now), expireRewards(db, now)]);
  // Housekeeping: expired sessions, old rate-limit windows, consumed/expired stamp codes.
  await db.execute(sql`delete from sessions where expires_at < now()`);
  await db.execute(sql`delete from rate_limits where window_start < now() - interval '2 days'`);
  await db.execute(sql`delete from stamp_codes where expires_at < now() - interval '30 days'`);
  return {
    at: now.toISOString(),
    quietHours: campaigns.quietHours,
    campaignsRun: campaigns.results.length,
    sent: campaigns.results.reduce((s, r) => s + r.sent, 0),
    skipped: campaigns.results.reduce((s, r) => s + r.skipped, 0),
    receiptsRetried: retried,
    receiptImagesPurged: purged,
    rewardsExpired: expired,
  };
}
