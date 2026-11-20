import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, type DB } from "@/db";
import { rewards, stampCodes, stampEvents } from "@/db/schema";
import { claimStampCode, createStampCode } from "@/domain/codes";
import { awardManualStamp, awardStamps, cardProgress, redeemReward } from "@/domain/loyalty";
import { setProgramStatus } from "@/domain/programs";
import { freshDb, makeBusiness, makeUser } from "../helpers";

let db: DB;
beforeEach(async () => {
  db = await freshDb();
});
afterAll(closeDb);

describe("stamp codes", () => {
  it("awards a stamp exactly once per code", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const customer = await makeUser(db, "customer");
    const { code } = await createStampCode(db, owner.id, { businessId: business.id, programId: program.id });

    const r = await claimStampCode(db, customer.id, code);
    expect(r.progress).toBe(1);
    await expect(claimStampCode(db, customer.id, code)).rejects.toMatchObject({ code: "invalid_code" });
    const other = await makeUser(db, "customer");
    await expect(claimStampCode(db, other.id, code)).rejects.toMatchObject({ code: "invalid_code" });
    expect(await cardProgress(db, program.id, customer.id)).toBe(1);
  });

  it("rejects expired codes", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const customer = await makeUser(db, "customer");
    const { id, code } = await createStampCode(db, owner.id, { businessId: business.id, programId: program.id });
    await db.update(stampCodes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(stampCodes.id, id));
    await expect(claimStampCode(db, customer.id, code)).rejects.toMatchObject({ code: "expired_code" });
    expect(await cardProgress(db, program.id, customer.id)).toBe(0);
  });

  it("is safe against concurrent double-claims", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const customer = await makeUser(db, "customer");
    const { code } = await createStampCode(db, owner.id, { businessId: business.id, programId: program.id });
    const results = await Promise.allSettled([1, 2, 3, 4].map(() => claimStampCode(db, customer.id, code)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await cardProgress(db, program.id, customer.id)).toBe(1);
  });

  it("business accounts cannot collect stamps", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const { code } = await createStampCode(db, owner.id, { businessId: business.id, programId: program.id });
    await expect(claimStampCode(db, owner.id, code)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("enforces the daily stamp limit and keeps the code usable on failure", async () => {
    const { owner, business, program } = await makeBusiness(db, { program: { maxStampsPerDay: 1 } });
    const customer = await makeUser(db, "customer");
    const c1 = await createStampCode(db, owner.id, { businessId: business.id, programId: program.id });
    const c2 = await createStampCode(db, owner.id, { businessId: business.id, programId: program.id });
    await claimStampCode(db, customer.id, c1.code);
    await expect(claimStampCode(db, customer.id, c2.code)).rejects.toMatchObject({ code: "daily_limit" });
    const [row] = await db.select().from(stampCodes).where(eq(stampCodes.id, c2.id));
    expect(row.usedAt).toBeNull();
  });

  it("does not award stamps on paused programs", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const customer = await makeUser(db, "customer");
    const { code } = await createStampCode(db, owner.id, { businessId: business.id, programId: program.id });
    await setProgramStatus(db, owner.id, business.id, program.id, "paused");
    await expect(claimStampCode(db, customer.id, code)).rejects.toMatchObject({ code: "program_inactive" });
  });
});

describe("rewards", () => {
  it("converts a full card into exactly one reward and resets progress", async () => {
    const { owner, business, program } = await makeBusiness(db); // 3 stamps required
    const customer = await makeUser(db, "customer");
    for (let i = 0; i < 2; i++) await awardManualStamp(db, owner.id, { businessId: business.id, programId: program.id, customerId: customer.id });
    const r = await awardManualStamp(db, owner.id, { businessId: business.id, programId: program.id, customerId: customer.id });
    expect(r.rewards).toHaveLength(1);
    expect(r.progress).toBe(0);
    const [{ consumed }] = await db
      .select({ consumed: sql<number>`count(*)::int` })
      .from(stampEvents)
      .where(and(eq(stampEvents.customerId, customer.id), sql`${stampEvents.consumedByRewardId} is not null`));
    expect(consumed).toBe(3);
  });

  it("expired stamps do not count towards the card", async () => {
    const { business, program } = await makeBusiness(db, { program: { stampValidityDays: 30 } });
    const customer = await makeUser(db, "customer");
    const old = new Date(Date.now() - 40 * 86400_000);
    await db.transaction((tx) => awardStamps(tx, { programId: program.id, customerId: customer.id, source: "manual", count: 2, now: old }));
    expect(await cardProgress(db, program.id, customer.id)).toBe(0);
    expect(business.id).toBeTruthy();
  });

  it("redeems once; a second redemption fails", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const customer = await makeUser(db, "customer");
    const res = await db.transaction((tx) => awardStamps(tx, { programId: program.id, customerId: customer.id, source: "manual", count: 3 }));
    const code = res.rewards[0].code;
    const redeemed = await redeemReward(db, owner.id, business.id, code);
    expect(redeemed.status).toBe("redeemed");
    await expect(redeemReward(db, owner.id, business.id, code)).rejects.toMatchObject({ code: "already_redeemed" });
  });

  it("concurrent redemptions succeed only once", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const customer = await makeUser(db, "customer");
    const res = await db.transaction((tx) => awardStamps(tx, { programId: program.id, customerId: customer.id, source: "manual", count: 3 }));
    const out = await Promise.allSettled([1, 2, 3].map(() => redeemReward(db, owner.id, business.id, res.rewards[0].code)));
    expect(out.filter((o) => o.status === "fulfilled")).toHaveLength(1);
  });

  it("rejects expired rewards", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const customer = await makeUser(db, "customer");
    const res = await db.transaction((tx) => awardStamps(tx, { programId: program.id, customerId: customer.id, source: "manual", count: 3 }));
    await db.update(rewards).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(rewards.id, res.rewards[0].id));
    await expect(redeemReward(db, owner.id, business.id, res.rewards[0].code)).rejects.toMatchObject({ code: "expired" });
  });
});
