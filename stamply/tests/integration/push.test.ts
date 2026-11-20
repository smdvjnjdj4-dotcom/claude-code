import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, type DB } from "@/db";
import { campaignDeliveries, campaigns, notifications, users } from "@/db/schema";
import { setMarketingConsent } from "@/domain/consent";
import { awardStamps } from "@/domain/loyalty";
import { createCampaign, setCampaignStatus } from "@/domain/push/campaigns";
import { runDueCampaigns } from "@/domain/push/dispatch";
import { freshDb, makeBusiness, makeUser } from "../helpers";

let db: DB;
beforeEach(async () => {
  db = await freshDb();
});
afterAll(closeDb);

const inbox = (userId: string) => db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.kind, "marketing")));
const manual = (name = "Wir vermissen dich") => ({
  name,
  type: "manual" as const,
  segment: "all_consented" as const,
  title: "Wir vermissen dich! ☕",
  body: "Hallo {vorname}, dein nächster Kaffee wartet schon auf dich.",
});

describe("push permissions", () => {
  it("only customers with consent receive marketing messages", async () => {
    const { owner, business, program } = await makeBusiness(db);
    const yes = await makeUser(db, "customer", "Anna Muster");
    const no = await makeUser(db, "customer", "Ben");
    const withdrawn = await makeUser(db, "customer", "Cleo");
    for (const u of [yes, no, withdrawn]) {
      await db.transaction((tx) => awardStamps(tx, { programId: program.id, customerId: u.id, source: "manual" }));
    }
    await setMarketingConsent(db, yes.id, business.id, true, "test");
    await setMarketingConsent(db, withdrawn.id, business.id, true, "test");
    await setMarketingConsent(db, withdrawn.id, business.id, false, "test");

    await createCampaign(db, owner.id, business.id, manual(), true);
    await runDueCampaigns(db);

    const got = await inbox(yes.id);
    expect(got).toHaveLength(1);
    expect(got[0].body).toContain("Hallo Anna");
    expect(await inbox(no.id)).toHaveLength(0);
    expect(await inbox(withdrawn.id)).toHaveLength(0);
  });

  it("consent for business A does not allow business B to send", async () => {
    const a = await makeBusiness(db, { name: "Laden A" });
    const b = await makeBusiness(db, { name: "Laden B" });
    const c = await makeUser(db, "customer");
    await setMarketingConsent(db, c.id, a.business.id, true, "test");
    await createCampaign(db, b.owner.id, b.business.id, manual(), true);
    await runDueCampaigns(db);
    expect(await inbox(c.id)).toHaveLength(0);
  });

  it("starter plan cannot create push campaigns", async () => {
    const { owner, business } = await makeBusiness(db, { plan: "starter" });
    await expect(createCampaign(db, owner.id, business.id, manual(), true)).rejects.toMatchObject({ code: "plan_required" });
  });

  it("business plan cannot use premium automations", async () => {
    const { owner, business } = await makeBusiness(db, { plan: "business" });
    await expect(
      createCampaign(db, owner.id, business.id, { ...manual(), type: "trigger", trigger: "inactive_days", triggerParam: 14 }, true),
    ).rejects.toMatchObject({ code: "plan_required" });
    await expect(createCampaign(db, owner.id, business.id, { ...manual(), type: "trigger", trigger: "one_stamp_left" }, true)).resolves.toBeTruthy();
  });

  it("is idempotent and enforces frequency caps", async () => {
    const { owner, business } = await makeBusiness(db);
    const c = await makeUser(db, "customer");
    await setMarketingConsent(db, c.id, business.id, true, "test");
    await createCampaign(db, owner.id, business.id, manual("Erste"), true);
    await runDueCampaigns(db);
    await runDueCampaigns(db);
    expect(await inbox(c.id)).toHaveLength(1);

    // Second campaign shortly after → blocked by the 48 h minimum gap, logged with reason.
    const second = await createCampaign(db, owner.id, business.id, { ...manual("Zweite"), title: "Neu: Kürbis-Latte", body: "Probier unseren neuen Kürbis-Latte!" }, true);
    await runDueCampaigns(db);
    expect(await inbox(c.id)).toHaveLength(1);
    const [log] = await db.select().from(campaignDeliveries).where(eq(campaignDeliveries.campaignId, second.id));
    expect(log.status).toBe("skipped");
    expect(log.reason).toBe("business_min_gap");
  });

  it("users who paused marketing receive nothing", async () => {
    const { owner, business } = await makeBusiness(db);
    const c = await makeUser(db, "customer");
    await setMarketingConsent(db, c.id, business.id, true, "test");
    await db.update(users).set({ marketingPaused: true }).where(eq(users.id, c.id));
    await createCampaign(db, owner.id, business.id, manual(), true);
    await runDueCampaigns(db);
    expect(await inbox(c.id)).toHaveLength(0);
  });

  it("nothing is sent during quiet hours; campaigns wait", async () => {
    process.env.QUIET_HOURS_START = "0";
    process.env.QUIET_HOURS_END = "24";
    try {
      const { owner, business } = await makeBusiness(db);
      const c = await makeUser(db, "customer");
      await setMarketingConsent(db, c.id, business.id, true, "test");
      const camp = await createCampaign(db, owner.id, business.id, manual(), true);
      const res = await runDueCampaigns(db);
      expect(res.quietHours).toBe(true);
      expect(await inbox(c.id)).toHaveLength(0);
      const [row] = await db.select().from(campaigns).where(eq(campaigns.id, camp.id));
      expect(row.status).toBe("scheduled");
    } finally {
      process.env.QUIET_HOURS_START = "0";
      process.env.QUIET_HOURS_END = "0";
    }
  });

  it("paused campaigns are not sent", async () => {
    const { owner, business } = await makeBusiness(db);
    const c = await makeUser(db, "customer");
    await setMarketingConsent(db, c.id, business.id, true, "test");
    const camp = await createCampaign(db, owner.id, business.id, { ...manual(), sendMode: "later", scheduledAt: new Date(Date.now() + 60_000) }, true);
    await setCampaignStatus(db, owner.id, business.id, camp.id, "pause");
    await runDueCampaigns(db, new Date(Date.now() + 120_000));
    expect(await inbox(c.id)).toHaveLength(0);
  });

  it("'one stamp left' trigger fires once per card cycle", async () => {
    const { owner, business, program } = await makeBusiness(db); // 3 required
    const c = await makeUser(db, "customer");
    await setMarketingConsent(db, c.id, business.id, true, "test");
    await createCampaign(db, owner.id, business.id, { ...manual(), type: "trigger", trigger: "one_stamp_left", title: "Fast geschafft!", body: "Nur noch ein Besuch bis zu deiner Belohnung." }, true);
    await db.transaction((tx) => awardStamps(tx, { programId: program.id, customerId: c.id, source: "manual", count: 2 }));
    await runDueCampaigns(db);
    expect(await inbox(c.id)).toHaveLength(1);
    // Next tick (15+ min later): same episode → no second message.
    await runDueCampaigns(db, new Date(Date.now() + 16 * 60_000));
    expect(await inbox(c.id)).toHaveLength(1);
  });
});
