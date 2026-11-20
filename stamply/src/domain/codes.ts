import { and, eq, isNull } from "drizzle-orm";
import type { DB } from "@/db";
import { loyaltyPrograms, stampCodes } from "@/db/schema";
import { audit } from "@/lib/audit";
import { hmac, humanCode, normalizeCode } from "@/lib/crypto";
import { DomainError } from "@/lib/errors";
import { enforce } from "@/lib/rate-limit";
import { requireCustomer, requireMember } from "./access";
import { awardStamps, notifyAward, programIsLive } from "./loyalty";

export const CODE_TTL_SECONDS = 180;
export const CODE_LENGTH = 8;

/**
 * Staff creates a one-time stamp code (shown as QR + text at the counter).
 * Only an HMAC of the code is stored, so a database leak does not reveal valid codes.
 */
export async function createStampCode(
  db: DB,
  actorId: string,
  input: { businessId: string; programId: string; locationId?: string | null; stamps?: number },
) {
  await requireMember(db, actorId, input.businessId, "stamps.issue");
  const stamps = input.stamps ?? 1;
  if (!Number.isInteger(stamps) || stamps < 1 || stamps > 5) {
    throw new DomainError("invalid_count", "Ein Code kann 1 bis 5 Stempel enthalten.");
  }
  const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, input.programId));
  if (!program || program.businessId !== input.businessId) {
    throw new DomainError("not_found", "Treueprogramm nicht gefunden.");
  }
  if (!programIsLive(program)) throw new DomainError("program_inactive", "Das Programm ist nicht aktiv.");
  await enforce(db, `code:create:${actorId}`, 60, 3600);

  const code = humanCode(CODE_LENGTH);
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);
  const [row] = await db
    .insert(stampCodes)
    .values({
      businessId: input.businessId,
      programId: input.programId,
      locationId: input.locationId ?? null,
      codeHash: hmac(`stamp-code:${code}`),
      stamps,
      createdBy: actorId,
      expiresAt,
    })
    .returning({ id: stampCodes.id });
  await audit(db, { actorId, businessId: input.businessId, action: "code.created", targetType: "stamp_code", targetId: row.id, meta: { stamps } });
  return { id: row.id, code, expiresAt, stamps };
}

/** Customer redeems a stamp code. Single use is enforced atomically in the same transaction. */
export async function claimStampCode(db: DB, customerId: string, rawCode: string) {
  await requireCustomer(db, customerId);
  // 8 chars from a 31-char alphabet ≈ 8.5e11 combinations; with this limit brute force is infeasible.
  await enforce(db, `code:claim:${customerId}`, 10, 600);
  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LENGTH) throw new DomainError("invalid_code", "Der Code ist ungültig.");
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(stampCodes)
      .set({ usedAt: now, usedBy: customerId })
      .where(and(eq(stampCodes.codeHash, hmac(`stamp-code:${code}`)), isNull(stampCodes.usedAt)))
      .returning();
    if (!claimed) throw new DomainError("invalid_code", "Der Code ist ungültig oder wurde bereits verwendet.");
    if (claimed.expiresAt <= now) throw new DomainError("expired_code", "Der Code ist abgelaufen. Bitte lass dir einen neuen zeigen.");
    const r = await awardStamps(tx, {
      programId: claimed.programId,
      customerId,
      source: "code",
      count: claimed.stamps,
      codeId: claimed.id,
      awardedBy: claimed.createdBy,
      locationId: claimed.locationId,
      now,
    });
    await audit(tx, { actorId: customerId, businessId: claimed.businessId, action: "code.claimed", targetType: "stamp_code", targetId: claimed.id });
    return r;
  });
  await notifyAward(db, customerId, result);
  return result;
}
