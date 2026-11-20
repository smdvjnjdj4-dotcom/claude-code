import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { businesses, loyaltyPrograms, receipts, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { hmac, sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";
import { DomainError } from "@/lib/errors";
import { enforce } from "@/lib/rate-limit";
import { deleteStored, processImage, readStored, storeImage } from "@/lib/storage";
import { localDate } from "@/lib/time";
import { runOcr, type OcrResult } from "@/ocr";
import { requireCustomer, requireMember } from "../access";
import { awardStamps, notifyAward, programIsLive, type AwardResult } from "../loyalty";
import { notifyUser } from "../notify";
import {
  assessRisk,
  decide,
  merchantMatchScore,
  parseReceiptText,
  receiptFingerprintParts,
  redactSensitive,
  RISK_LABELS,
} from "./analyze";

export type ReceiptDeps = { ocr: (img: Buffer) => Promise<OcrResult | null> };
const defaultDeps: ReceiptDeps = { ocr: runOcr };

export type SubmitOutcome =
  | { status: "approved"; receiptId: string; award: AwardResult }
  | { status: "needs_review"; receiptId: string }
  | { status: "rejected"; receiptId: string; reason: string };

/**
 * Customer uploads a receipt photo. Flow: validate image → exact-duplicate check → OCR →
 * field extraction → risk scoring → auto-approve (low risk), auto-reject (clear duplicate /
 * impossible date) or route to the business for manual review.
 */
export async function submitReceipt(
  db: DB,
  customerId: string,
  input: { programId: string; image: Buffer },
  deps: ReceiptDeps = defaultDeps,
): Promise<SubmitOutcome> {
  await requireCustomer(db, customerId);
  await enforce(db, `receipt:hour:${customerId}`, 6, 3600);
  await enforce(db, `receipt:day:${customerId}`, 20, 86400);

  const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, input.programId));
  if (!program || !programIsLive(program)) {
    throw new DomainError("program_inactive", "Dieses Treueprogramm ist derzeit nicht aktiv.");
  }
  const [business] = await db.select().from(businesses).where(eq(businesses.id, program.businessId));
  if (!business?.published) throw new DomainError("not_found", "Unternehmen nicht gefunden.");

  const imageSha = sha256(input.image);
  const processed = await processImage(input.image, "receipt");
  const processedSha = sha256(processed);
  const dup = await db
    .select({ id: receipts.id })
    .from(receipts)
    .where(and(eq(receipts.businessId, business.id), inArray(receipts.imageSha256, [imageSha, processedSha])))
    .limit(1);
  if (dup.length) throw new DomainError("duplicate_receipt", "Dieser Kassenbon wurde bereits eingereicht.");

  const imagePath = await storeImage(processed, "receipt");
  let receiptId: string;
  try {
    const [row] = await db
      .insert(receipts)
      .values({ businessId: business.id, programId: program.id, customerId, imagePath, imageSha256: imageSha, status: "processing" })
      .returning({ id: receipts.id });
    receiptId = row.id;
  } catch (e) {
    await deleteStored(imagePath);
    if (String((e as Error).message).includes("receipts_business_image_unique")) {
      throw new DomainError("duplicate_receipt", "Dieser Kassenbon wurde bereits eingereicht.");
    }
    throw e;
  }

  return analyzeAndDecide(db, receiptId, processed, deps);
}

/** Runs OCR + risk assessment for a receipt in status "processing". Also used by the worker for retries. */
export async function analyzeAndDecide(db: DB, receiptId: string, image: Buffer, deps: ReceiptDeps = defaultDeps): Promise<SubmitOutcome> {
  const [r] = await db.select().from(receipts).where(eq(receipts.id, receiptId));
  if (!r || r.status !== "processing" || !r.customerId) throw new DomainError("not_found", "Beleg nicht gefunden.");
  const [program] = await db.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.id, r.programId));
  const [business] = await db.select().from(businesses).where(eq(businesses.id, r.businessId));

  const ocr = await deps.ocr(image);
  const text = ocr?.text ?? "";
  const parsed = parseReceiptText(text);
  const merchantScore = merchantMatchScore(text, [business.name, ...business.receiptAliases]);
  const fpParts = receiptFingerprintParts(business.id, parsed);
  const fingerprint = fpParts ? hmac(`receipt-fp:${fpParts}`) : null;

  const duplicateOfApproved = fingerprint
    ? (
        await db
          .select({ id: receipts.id })
          .from(receipts)
          .where(and(eq(receipts.businessId, business.id), eq(receipts.fingerprint, fingerprint), eq(receipts.status, "approved")))
          .limit(1)
      ).length > 0
    : false;
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(receipts)
    .where(and(eq(receipts.customerId, r.customerId), eq(receipts.businessId, business.id), gt(receipts.createdAt, new Date(Date.now() - 86400_000))));

  const risk = assessRisk({
    ocrAvailable: ocr !== null && text.trim().length > 0,
    ocrConfidence: ocr?.confidence ?? null,
    merchantScore,
    parsed,
    minPurchaseCents: program.minPurchaseCents,
    todayIso: localDate(),
    duplicateOfApproved,
    // the current receipt is included in the count
    submissionsLast24h: Math.max(0, Number(recent) - 1),
  });
  const decision = decide(risk, business.receiptReviewMode);

  await db
    .update(receipts)
    .set({
      ocrText: text ? redactSensitive(text) : null,
      ocrConfidence: ocr?.confidence ?? null,
      detectedMerchant: merchantScore >= 0.6 ? business.name : null,
      detectedDate: parsed.date,
      detectedAmountCents: parsed.amountCents,
      detectedReceiptNo: parsed.receiptNo,
      fingerprint,
      riskScore: risk.score,
      riskFlags: risk.flags,
      status: "needs_review",
    })
    .where(eq(receipts.id, receiptId));

  if (decision === "auto_reject") {
    const reason = risk.flags.includes("duplicate_receipt") ? RISK_LABELS.duplicate_receipt : RISK_LABELS.date_in_future;
    await finalize(db, receiptId, "rejected", null, reason);
    return { status: "rejected", receiptId, reason };
  }
  if (decision === "auto_approve") {
    try {
      const award = await approveAndAward(db, receiptId, null);
      return { status: "approved", receiptId, award };
    } catch (e) {
      if (e instanceof DomainError && e.code === "daily_limit") {
        await finalize(db, receiptId, "rejected", null, e.message);
        return { status: "rejected", receiptId, reason: e.message };
      }
      throw e;
    }
  }
  return { status: "needs_review", receiptId };
}

async function approveAndAward(db: DB, receiptId: string, actorId: string | null): Promise<AwardResult> {
  const result = await db.transaction(async (tx) => {
    const [r] = await tx
      .update(receipts)
      .set({ status: "approved", decidedBy: actorId, decidedAt: new Date(), decisionNote: actorId ? "Manuell bestätigt" : "Automatisch bestätigt" })
      .where(and(eq(receipts.id, receiptId), inArray(receipts.status, ["needs_review", "processing"])))
      .returning();
    if (!r || !r.customerId) throw new DomainError("already_decided", "Dieser Beleg wurde bereits bearbeitet.");
    const award = await awardStamps(tx, {
      programId: r.programId,
      customerId: r.customerId,
      source: "receipt",
      receiptId: r.id,
      awardedBy: actorId,
    });
    await audit(tx, { actorId, businessId: r.businessId, action: actorId ? "receipt.approved" : "receipt.auto_approved", targetType: "receipt", targetId: r.id });
    return { award, customerId: r.customerId };
  });
  await notifyAward(db, result.customerId, result.award);
  return result.award;
}

async function finalize(db: DB, receiptId: string, status: "rejected", actorId: string | null, note: string) {
  const [r] = await db
    .update(receipts)
    .set({ status, decidedBy: actorId, decidedAt: new Date(), decisionNote: note })
    .where(and(eq(receipts.id, receiptId), inArray(receipts.status, ["needs_review", "processing"])))
    .returning();
  if (!r) throw new DomainError("already_decided", "Dieser Beleg wurde bereits bearbeitet.");
  await audit(db, { actorId, businessId: r.businessId, action: actorId ? "receipt.rejected" : "receipt.auto_rejected", targetType: "receipt", targetId: r.id });
  if (r.customerId) {
    const [b] = await db.select({ name: businesses.name, slug: businesses.slug }).from(businesses).where(eq(businesses.id, r.businessId));
    await notifyUser(db, r.customerId, {
      businessId: r.businessId,
      title: `Bon bei ${b?.name ?? "Unternehmen"} nicht bestätigt`,
      body: note,
      link: `/b/${b?.slug ?? ""}`,
    });
  }
  return r;
}

/** Business member decides on a receipt in the review queue (tenant-scoped). */
export async function reviewReceipt(
  db: DB,
  actorId: string,
  businessId: string,
  receiptId: string,
  decision: "approve" | "reject",
  note?: string,
) {
  await requireMember(db, actorId, businessId, "receipts.review");
  const [r] = await db.select().from(receipts).where(and(eq(receipts.id, receiptId), eq(receipts.businessId, businessId)));
  if (!r) throw new DomainError("not_found", "Beleg nicht gefunden.");
  if (decision === "approve") return { approved: true as const, award: await approveAndAward(db, receiptId, actorId) };
  await finalize(db, receiptId, "rejected", actorId, note?.trim() || "Der Bon konnte nicht bestätigt werden.");
  return { approved: false as const };
}

export async function listReceiptQueue(db: DB, actorId: string, businessId: string, status: "needs_review" | "approved" | "rejected" = "needs_review") {
  await requireMember(db, actorId, businessId, "receipts.review");
  return db
    .select({
      receipt: receipts,
      programName: loyaltyPrograms.name,
      minPurchaseCents: loyaltyPrograms.minPurchaseCents,
      customerName: users.name,
    })
    .from(receipts)
    .innerJoin(loyaltyPrograms, eq(loyaltyPrograms.id, receipts.programId))
    .leftJoin(users, eq(users.id, receipts.customerId))
    .where(and(eq(receipts.businessId, businessId), eq(receipts.status, status)))
    .orderBy(status === "needs_review" ? receipts.createdAt : desc(receipts.decidedAt))
    .limit(50);
}

/** Authorization for viewing a receipt image: the submitting customer or a reviewer of that business. */
export async function canViewReceiptImage(db: DB, userId: string, key: string) {
  const [r] = await db.select().from(receipts).where(eq(receipts.imagePath, key));
  if (!r) return false;
  if (r.customerId === userId) return true;
  try {
    await requireMember(db, userId, r.businessId, "receipts.review");
    return true;
  } catch {
    return false;
  }
}

/** Data minimisation: delete receipt images (and OCR text) after the retention period. */
export async function purgeReceiptImages(db: DB, now = new Date()) {
  const cutoff = new Date(now.getTime() - env.receiptRetentionDays * 86400_000);
  const stale = await db
    .select({ id: receipts.id, imagePath: receipts.imagePath })
    .from(receipts)
    .where(
      and(
        sql`${receipts.imagePath} is not null`,
        sql`(${receipts.status} in ('approved','rejected') and ${receipts.decidedAt} < ${cutoff.toISOString()}::timestamptz)
            or ${receipts.createdAt} < ${new Date(cutoff.getTime() - 30 * 86400_000).toISOString()}::timestamptz`,
      ),
    )
    .limit(500);
  for (const s of stale) {
    await deleteStored(s.imagePath);
    await db.update(receipts).set({ imagePath: null, ocrText: null, imagePurgedAt: now }).where(eq(receipts.id, s.id));
  }
  return stale.length;
}

/** Retries receipts stuck in "processing" (e.g. server restart during OCR). */
export async function retryStuckReceipts(db: DB) {
  const stuck = await db
    .select()
    .from(receipts)
    .where(and(eq(receipts.status, "processing"), sql`${receipts.createdAt} < now() - interval '5 minutes'`))
    .limit(10);
  for (const r of stuck) {
    const img = r.imagePath ? await readStored(r.imagePath) : null;
    if (img) await analyzeAndDecide(db, r.id, img).catch((e) => console.error(e));
    else await db.update(receipts).set({ status: "needs_review", riskFlags: ["ocr_unavailable"] }).where(eq(receipts.id, r.id));
  }
  return stuck.length;
}
