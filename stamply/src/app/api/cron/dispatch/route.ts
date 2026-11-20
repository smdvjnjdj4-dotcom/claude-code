import { getDb } from "@/db";
import { runMaintenance } from "@/domain/maintenance";
import { safeEqual } from "@/lib/crypto";
import { env } from "@/lib/env";

/**
 * Scheduler endpoint for hosts without a long-running worker (e.g. Vercel Cron, GitHub Actions,
 * cron-job.org). Call every minute with: Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(req: Request) {
  const secret = env.cronSecret;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || secret.startsWith("change-me") || !safeEqual(auth, `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runMaintenance(getDb());
  return Response.json(result);
}

export const GET = POST;
