import type { Tx } from "@/db";
import { auditLogs } from "@/db/schema";

/** Records a security-relevant action. Never put secrets or full personal data into `meta`. */
export async function audit(
  db: Tx,
  entry: {
    actorId: string | null;
    businessId?: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    meta?: Record<string, unknown>;
  },
) {
  await db.insert(auditLogs).values({
    actorId: entry.actorId,
    businessId: entry.businessId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    meta: entry.meta,
  });
}
