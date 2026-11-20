import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, type DB } from "@/db";
import { businesses, receipts } from "@/db/schema";
import { cardProgress } from "@/domain/loyalty";
import { reviewReceipt, submitReceipt } from "@/domain/receipts/service";
import { localDate } from "@/lib/time";
import { freshDb, makeBusiness, makeUser, sampleImage } from "../helpers";

let db: DB;
beforeEach(async () => {
  db = await freshDb();
});
afterAll(closeDb);

const today = () => localDate().split("-").reverse().join(".");
const receiptText = (name: string, amount = "12,40", no = "4711", time = "10:15") =>
  `${name}\nHauptstraße 1\n10115 Berlin\n${today()} ${time}\nCappuccino 3,90\nCroissant 2,50\nSUMME EUR ${amount}\nBon-Nr. ${no}\nKartenzahlung\nVielen Dank!`;
const ocr = (text: string) => async () => ({ text, confidence: 88 });

describe("receipt verification", () => {
  it("auto-approves a clean receipt and awards one stamp", async () => {
    const { business, program } = await makeBusiness(db, { name: "Café Bohne", program: { minPurchaseCents: 500 } });
    const c = await makeUser(db, "customer");
    const out = await submitReceipt(db, c.id, { programId: program.id, image: await sampleImage(1) }, { ocr: ocr(receiptText("Café Bohne")) });
    expect(out.status).toBe("approved");
    expect(await cardProgress(db, program.id, c.id)).toBe(1);
    const [r] = await db.select().from(receipts).where(eq(receipts.businessId, business.id));
    expect(r.detectedAmountCents).toBe(1240);
  });

  it("rejects the exact same image twice", async () => {
    const { program } = await makeBusiness(db, { name: "Café Bohne" });
    const c = await makeUser(db, "customer");
    const img = await sampleImage(2);
    await submitReceipt(db, c.id, { programId: program.id, image: img }, { ocr: ocr(receiptText("Café Bohne")) });
    await expect(submitReceipt(db, c.id, { programId: program.id, image: img }, { ocr: ocr(receiptText("Café Bohne")) })).rejects.toMatchObject({
      code: "duplicate_receipt",
    });
    // also for another customer
    const c2 = await makeUser(db, "customer");
    await expect(submitReceipt(db, c2.id, { programId: program.id, image: img })).rejects.toMatchObject({ code: "duplicate_receipt" });
  });

  it("detects the same paper receipt photographed again (fingerprint) and rejects it", async () => {
    const { program } = await makeBusiness(db, { name: "Café Bohne" });
    const c = await makeUser(db, "customer");
    const c2 = await makeUser(db, "customer");
    const text = receiptText("Café Bohne");
    await submitReceipt(db, c.id, { programId: program.id, image: await sampleImage(3) }, { ocr: ocr(text) });
    const out = await submitReceipt(db, c2.id, { programId: program.id, image: await sampleImage(4) }, { ocr: ocr(text) });
    expect(out.status).toBe("rejected");
    expect(await cardProgress(db, program.id, c2.id)).toBe(0);
  });

  it("routes uncertain receipts to manual review (wrong merchant, below minimum, unreadable)", async () => {
    const { program } = await makeBusiness(db, { name: "Café Bohne", program: { minPurchaseCents: 2000 } });
    const c = await makeUser(db, "customer");
    const wrong = await submitReceipt(db, c.id, { programId: program.id, image: await sampleImage(5) }, { ocr: ocr(receiptText("Pizzeria Roma", "25,00", "1")) });
    expect(wrong.status).toBe("needs_review");
    const small = await submitReceipt(db, c.id, { programId: program.id, image: await sampleImage(6) }, { ocr: ocr(receiptText("Café Bohne", "9,99", "2")) });
    expect(small.status).toBe("needs_review");
    const unreadable = await submitReceipt(db, c.id, { programId: program.id, image: await sampleImage(7) }, { ocr: async () => null });
    expect(unreadable.status).toBe("needs_review");
    expect(await cardProgress(db, program.id, c.id)).toBe(0);
  });

  it("always_manual mode never auto-approves; reviewer approves exactly once", async () => {
    const { owner, business, program } = await makeBusiness(db, { name: "Café Bohne" });
    await db.update(businesses).set({ receiptReviewMode: "always_manual" }).where(eq(businesses.id, business.id));
    const c = await makeUser(db, "customer");
    const out = await submitReceipt(db, c.id, { programId: program.id, image: await sampleImage(8) }, { ocr: ocr(receiptText("Café Bohne")) });
    expect(out.status).toBe("needs_review");
    await reviewReceipt(db, owner.id, business.id, out.receiptId, "approve");
    await expect(reviewReceipt(db, owner.id, business.id, out.receiptId, "approve")).rejects.toMatchObject({ code: "already_decided" });
    await expect(reviewReceipt(db, owner.id, business.id, out.receiptId, "reject")).rejects.toMatchObject({ code: "already_decided" });
    expect(await cardProgress(db, program.id, c.id)).toBe(1);
  });

  it("stores OCR text only with payment data redacted", async () => {
    const { business, program } = await makeBusiness(db, { name: "Café Bohne" });
    const c = await makeUser(db, "customer");
    const text = receiptText("Café Bohne") + "\nKarte 4111 1111 1111 1111\nIBAN DE89 3704 0044 0532 0130 00";
    await submitReceipt(db, c.id, { programId: program.id, image: await sampleImage(9) }, { ocr: ocr(text) });
    const [r] = await db.select().from(receipts).where(eq(receipts.businessId, business.id));
    expect(r.ocrText).not.toContain("4111 1111");
    expect(r.ocrText).not.toContain("3704 0044");
  });

  it("rejects non-image uploads", async () => {
    const { program } = await makeBusiness(db);
    const c = await makeUser(db, "customer");
    await expect(submitReceipt(db, c.id, { programId: program.id, image: Buffer.from("<script>alert(1)</script>") })).rejects.toMatchObject({
      code: "invalid_image",
    });
  });
});
