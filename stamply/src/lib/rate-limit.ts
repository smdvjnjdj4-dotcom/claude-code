import { sql } from "drizzle-orm";
import type { Tx } from "@/db";
import { DomainError } from "./errors";

/**
 * Fixed-window rate limiter stored in Postgres, so it works across multiple app instances.
 * Returns true if the call is allowed.
 */
export async function hit(db: Tx, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   then now() else rate_limits.window_start end
    returning count`);
  return Number(rows[0]?.count ?? 0) <= limit;
}

export async function enforce(db: Tx, key: string, limit: number, windowSeconds: number) {
  if (!(await hit(db, key, limit, windowSeconds))) {
    throw new DomainError("rate_limited", "Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.");
  }
}
