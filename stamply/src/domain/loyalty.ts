import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import type { DB, Tx } from "@/db";
import {
  businesses,
  loyaltyPrograms,
  rewards,
  stampEvents,
  users,
  type LoyaltyProgram,
  type Reward,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { humanCode } from "@/lib/crypto";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { requireMember } from "./access";
import { notifyUser } from "./notify";

export type AwardInput = {
  programId: string;
  customerId: string;
  source: "receipt" | "code" | "manual";
  count?: number;
  receiptId?: string | null;
  codeId?: string | null;
  awardedBy?: string | null;
  locationId?: string | null;
  now?: Date;
};

export type AwardResult = {
  programId: string;
  businessId: string;
  stampsAdded: number;
  progress: number;
  required: number;
  rewards: Pick<Reward, "id" | "title" | "code">[];
};

export function programIsLive(p: LoyaltyProgram, now = new Date()) {
  return (
    p.status === "active" && (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt > now)
  );
}

/** Active (unconsumed, unexpired) stamp condition for a card. */
const activeStamp = (now: Date) =>
  and(isNull(stampEvents.consumedByRewardId), or(isNull(stampEvents.expiresAt), gt(stampEvents.expiresAt, now)));

/**
 * Awards stamps – the ONLY code path that creates stamp events. Must run inside a transaction.
 * Serialises per (program, customer) with an advisory lock, enforces program window and the
 * daily limit, and converts full cards into rewards atomically.
 */
export async function awardStamps(tx: Tx, input: AwardInput): Promise<AwardResult> {
  const now = input.now ?? new Date();
  const count = input.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new DomainError("invalid_count", "Ungültige Stempelanzahl.");
  }
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.programId + ":" + input.customerId}, 0))`);

  const [program] = await tx.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, input.programId));
  if (!program) throw new DomainError("not_found", "Treueprogramm nicht gefunden.");
  if (!programIsLive(program, now)) {
    throw new DomainError("program_inactive", "Dieses Treueprogramm ist derzeit nicht aktiv.");
  }
  const [customer] = await tx
    .select({ id: users.id, type: users.accountType })
    .from(users)
    .where(eq(users.id, input.customerId));
  if (!customer || customer.type !== "customer") {
    throw new DomainError("forbidden", "Stempel können nur auf Kundenkonten gesammelt werden.");
  }
  if (program.locationIds?.length && input.locationId && !program.locationIds.includes(input.locationId)) {
    throw new DomainError("location_not_eligible", "Diese Filiale nimmt an dem Programm nicht teil.");
  }

  // Daily limit, measured in the platform's local day.
  const [{ today }] = await tx.execute<{ today: number }>(sql`
    select count(*)::int as today from stamp_events
    where program_id = ${program.id} and customer_id = ${input.customerId}
      and created_at >= (date_trunc('day', ${now.toISOString()}::timestamptz at time zone ${env.timezone}) at time zone ${env.timezone})`);
  if (Number(today) + count > program.maxStampsPerDay) {
    throw new DomainError(
      "daily_limit",
      `Tageslimit erreicht: maximal ${program.maxStampsPerDay} Stempel pro Tag für dieses Programm.`,
    );
  }

  const expiresAt = program.stampValidityDays ? new Date(now.getTime() + program.stampValidityDays * 86400_000) : null;
  await tx.insert(stampEvents).values(
    Array.from({ length: count }, (_, i) => ({
      businessId: program.businessId,
      programId: program.id,
      customerId: input.customerId,
      locationId: input.locationId ?? null,
      source: input.source,
      // Unique index on receipt_id: the same receipt can never yield a second stamp row.
      receiptId: i === 0 ? (input.receiptId ?? null) : null,
      codeId: input.codeId ?? null,
      awardedBy: input.awardedBy ?? null,
      expiresAt,
      createdAt: now,
    })),
  );

  // Convert full cards into rewards (oldest stamps first).
  const created: AwardResult["rewards"] = [];
  for (;;) {
    const active = await tx
      .select({ id: stampEvents.id })
      .from(stampEvents)
      .where(and(eq(stampEvents.programId, program.id), eq(stampEvents.customerId, input.customerId), activeStamp(now)))
      .orderBy(asc(stampEvents.createdAt), asc(stampEvents.id))
      .limit(program.stampsRequired);
    if (active.length < program.stampsRequired) break;
    const [reward] = await tx
      .insert(rewards)
      .values({
        businessId: program.businessId,
        programId: program.id,
        customerId: input.customerId,
        title: program.rewardTitle,
        rewardType: program.rewardType,
        rewardValue: program.rewardValue,
        code: humanCode(8),
        expiresAt: program.rewardValidityDays ? new Date(now.getTime() + program.rewardValidityDays * 86400_000) : null,
        createdAt: now,
      })
      .returning({ id: rewards.id, title: rewards.title, code: rewards.code });
    await tx
      .update(stampEvents)
      .set({ consumedByRewardId: reward.id })
      .where(inArray(stampEvents.id, active.map((a) => a.id)));
    created.push(reward);
  }

  const progress = await cardProgress(tx, program.id, input.customerId, now);
  return {
    programId: program.id,
    businessId: program.businessId,
    stampsAdded: count,
    progress,
    required: program.stampsRequired,
    rewards: created,
  };
}

export async function cardProgress(db: Tx, programId: string, customerId: string, now = new Date()) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(stampEvents)
    .where(and(eq(stampEvents.programId, programId), eq(stampEvents.customerId, customerId), activeStamp(now)));
  return Number(r?.n ?? 0);
}

/** Sends the customer-facing confirmation after a successful award (outside the transaction). */
export async function notifyAward(db: DB, customerId: string, result: AwardResult) {
  const [b] = await db
    .select({ name: businesses.name, slug: businesses.slug })
    .from(businesses)
    .where(eq(businesses.id, result.businessId));
  if (!b) return;
  for (const r of result.rewards) {
    await notifyUser(db, customerId, {
      businessId: result.businessId,
      title: `🎉 Belohnung freigeschaltet bei ${b.name}`,
      body: `${r.title} – zeige deinen Code an der Kasse.`,
      link: `/rewards/${r.id}`,
    });
  }
  if (!result.rewards.length) {
    const left = result.required - result.progress;
    await notifyUser(db, customerId, {
      businessId: result.businessId,
      title: `Stempel erhalten bei ${b.name}`,
      body: left === 1 ? "Nur noch 1 Stempel bis zu deiner Belohnung!" : `Noch ${left} Stempel bis zu deiner Belohnung.`,
      link: `/b/${b.slug}`,
    });
  }
}

/** Manual stamp by staff (e.g. customer shows their account at the counter). */
export async function awardManualStamp(
  db: DB,
  actorId: string,
  input: { businessId: string; programId: string; customerId: string; locationId?: string | null },
) {
  await requireMember(db, actorId, input.businessId, "stamps.issue");
  const result = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, input.programId));
    if (!p || p.businessId !== input.businessId) throw new DomainError("not_found", "Treueprogramm nicht gefunden.");
    const r = await awardStamps(tx, { ...input, source: "manual", awardedBy: actorId });
    await audit(tx, {
      actorId,
      businessId: input.businessId,
      action: "stamp.manual",
      targetType: "program",
      targetId: input.programId,
    });
    return r;
  });
  await notifyAward(db, input.customerId, result);
  return result;
}

/* ─────────────────────────── Rewards ─────────────────────────── */

/**
 * Staff redeems a reward by its code. Scoped to the staff member's business: a code from another
 * business is indistinguishable from an unknown code (no cross-tenant information leak).
 */
export async function redeemReward(db: DB, actorId: string, businessId: string, rawCode: string) {
  await requireMember(db, actorId, businessId, "rewards.redeem");
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [reward] = await tx
      .select()
      .from(rewards)
      .where(and(eq(rewards.code, code), eq(rewards.businessId, businessId)))
      .for("update");
    if (!reward) throw new DomainError("not_found", "Kein Belohnungscode mit diesem Wert gefunden.");
    if (reward.status === "redeemed") {
      throw new DomainError(
        "already_redeemed",
        `Diese Belohnung wurde bereits am ${reward.redeemedAt?.toLocaleString("de-DE", { timeZone: env.timezone })} eingelöst.`,
      );
    }
    if (reward.status === "expired" || (reward.expiresAt && reward.expiresAt <= now)) {
      if (reward.status !== "expired") await tx.update(rewards).set({ status: "expired" }).where(eq(rewards.id, reward.id));
      throw new DomainError("expired", "Diese Belohnung ist abgelaufen.");
    }
    const [updated] = await tx
      .update(rewards)
      .set({ status: "redeemed", redeemedAt: now, redeemedBy: actorId })
      .where(and(eq(rewards.id, reward.id), eq(rewards.status, "available")))
      .returning();
    if (!updated) throw new DomainError("already_redeemed", "Diese Belohnung wurde bereits eingelöst.");
    await audit(tx, { actorId, businessId, action: "reward.redeemed", targetType: "reward", targetId: reward.id });
    return updated;
  });
  if (result.customerId) {
    await notifyUser(db, result.customerId, {
      businessId,
      title: "Belohnung eingelöst ✓",
      body: `${result.title} wurde gerade eingelöst. Viel Freude!`,
      link: "/rewards",
    });
  }
  return result;
}

/** Marks overdue rewards as expired (housekeeping, run by the worker). */
export async function expireRewards(db: Tx, now = new Date()) {
  const res = await db
    .update(rewards)
    .set({ status: "expired" })
    .where(and(eq(rewards.status, "available"), sql`${rewards.expiresAt} is not null and ${rewards.expiresAt} <= ${now.toISOString()}::timestamptz`))
    .returning({ id: rewards.id });
  return res.length;
}
