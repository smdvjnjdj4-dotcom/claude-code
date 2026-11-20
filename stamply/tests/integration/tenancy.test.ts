import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, type DB } from "@/db";
import { createStampCode } from "@/domain/codes";
import { awardManualStamp, awardStamps, redeemReward } from "@/domain/loyalty";
import { createCampaign, listCampaigns } from "@/domain/push/campaigns";
import { getProgram, updateProgram } from "@/domain/programs";
import { listReceiptQueue, reviewReceipt, submitReceipt } from "@/domain/receipts/service";
import { customerList, businessOverview } from "@/domain/stats";
import { inviteMember, acceptInvite, updateBusinessProfile } from "@/domain/businesses";
import { freshDb, makeBusiness, makeUser, sampleImage } from "../helpers";

let db: DB;
beforeEach(async () => {
  db = await freshDb();
});
afterAll(closeDb);

describe("tenant isolation", () => {
  it("a business cannot read or modify another business's data", async () => {
    const a = await makeBusiness(db, { name: "Café A" });
    const b = await makeBusiness(db, { name: "Barber B" });

    await expect(getProgram(db, b.owner.id, a.business.id, a.program.id)).rejects.toMatchObject({ code: "forbidden" });
    // Own business id but foreign program id → not found (no leak)
    await expect(getProgram(db, b.owner.id, b.business.id, a.program.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(
      updateProgram(db, b.owner.id, b.business.id, a.program.id, { name: "Hack", stampsRequired: 2, rewardType: "custom", rewardTitle: "x" }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(createStampCode(db, b.owner.id, { businessId: b.business.id, programId: a.program.id })).rejects.toMatchObject({ code: "not_found" });
    await expect(customerList(db, b.owner.id, a.business.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(businessOverview(db, b.owner.id, a.business.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(listCampaigns(db, b.owner.id, a.business.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(updateBusinessProfile(db, b.owner.id, a.business.id, { name: "Hijack", category: "cafe" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      awardManualStamp(db, b.owner.id, { businessId: b.business.id, programId: a.program.id, customerId: (await makeUser(db, "customer")).id }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("a reward code of business A cannot be redeemed by business B", async () => {
    const a = await makeBusiness(db, { name: "Café A" });
    const b = await makeBusiness(db, { name: "Barber B" });
    const customer = await makeUser(db, "customer");
    const res = await db.transaction((tx) => awardStamps(tx, { programId: a.program.id, customerId: customer.id, source: "manual", count: 3 }));
    await expect(redeemReward(db, b.owner.id, b.business.id, res.rewards[0].code)).rejects.toMatchObject({ code: "not_found" });
    await expect(redeemReward(db, b.owner.id, a.business.id, res.rewards[0].code)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("a business cannot review another business's receipts", async () => {
    const a = await makeBusiness(db, { name: "Café A", program: { minPurchaseCents: 0 } });
    const b = await makeBusiness(db, { name: "Barber B" });
    const customer = await makeUser(db, "customer");
    const out = await submitReceipt(db, customer.id, { programId: a.program.id, image: await sampleImage(1) }, { ocr: async () => null });
    expect(out.status).toBe("needs_review");
    await expect(reviewReceipt(db, b.owner.id, b.business.id, out.receiptId, "approve")).rejects.toMatchObject({ code: "not_found" });
    await expect(listReceiptQueue(db, b.owner.id, a.business.id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("customers cannot use business functions", async () => {
    const a = await makeBusiness(db);
    const customer = await makeUser(db, "customer");
    await expect(getProgram(db, customer.id, a.business.id, a.program.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(createCampaign(db, customer.id, a.business.id, { name: "x", type: "manual", title: "Hallo", body: "Hallo Welt" }, true)).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("roles", () => {
  it("staff can issue stamps but cannot manage programs, campaigns or the team", async () => {
    const a = await makeBusiness(db);
    const staff = await makeUser(db, "business", "Staff");
    const { token } = await inviteMember(db, a.owner.id, a.business.id, staff.email, "staff");
    await acceptInvite(db, staff.id, token);

    await expect(createStampCode(db, staff.id, { businessId: a.business.id, programId: a.program.id })).resolves.toBeTruthy();
    await expect(
      updateProgram(db, staff.id, a.business.id, a.program.id, { name: "x", stampsRequired: 2, rewardType: "custom", rewardTitle: "x" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(createCampaign(db, staff.id, a.business.id, { name: "x", type: "manual", title: "Hallo", body: "Hallo Welt" }, true)).rejects.toMatchObject({ code: "forbidden" });
    await expect(inviteMember(db, staff.id, a.business.id, "x@y.de", "staff")).rejects.toMatchObject({ code: "forbidden" });
    await expect(businessOverview(db, staff.id, a.business.id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("an invite can only be accepted by the invited e-mail address", async () => {
    const a = await makeBusiness(db);
    const intruder = await makeUser(db, "business");
    const { token } = await inviteMember(db, a.owner.id, a.business.id, "someone@else.de", "manager");
    await expect(acceptInvite(db, intruder.id, token)).rejects.toMatchObject({ code: "email_mismatch" });
  });
});
