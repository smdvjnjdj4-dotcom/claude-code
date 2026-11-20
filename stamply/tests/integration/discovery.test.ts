import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { closeDb, type DB } from "@/db";
import { businesses } from "@/db/schema";
import { discover, getBusinessPublic } from "@/domain/discovery";
import { exportPersonalData, deleteAccount } from "@/domain/customers";
import { awardStamps } from "@/domain/loyalty";
import { setMarketingConsent } from "@/domain/consent";
import { freshDb, makeBusiness, makeUser } from "../helpers";
import { stampEvents } from "@/db/schema";

let db: DB;
beforeEach(async () => {
  db = await freshDb();
});
afterAll(closeDb);

describe("discovery", () => {
  it("lists only published businesses and computes real distances", async () => {
    const a = await makeBusiness(db, { name: "Café Nah" });
    const hidden = await makeBusiness(db, { name: "Versteckt" });
    await db.update(businesses).set({ published: false }).where(eq(businesses.id, hidden.business.id));

    const noLoc = await discover(db, {});
    expect(noLoc.map((r) => r.name)).toEqual(["Café Nah"]);
    expect(noLoc[0].distanceM).toBeNull(); // no location → no invented distance

    const withLoc = await discover(db, { lat: 52.52, lng: 13.405, sort: "distance" });
    expect(withLoc[0].distanceM).toBeGreaterThan(1000);
    expect(withLoc[0].distanceM).toBeLessThan(2000);

    for (const sort of ["relevance", "popular", "new", "distance"] as const) {
      await expect(discover(db, { sort, q: "café", category: "cafe", interests: ["cafe"], lat: 52.5, lng: 13.4, radiusKm: 10, onlyWithRewards: true })).resolves.toHaveLength(1);
      await expect(discover(db, { sort, interests: ["cafe"] })).resolves.toHaveLength(1);
    }
    expect(await discover(db, { q: "zzz" })).toHaveLength(0);
    expect(a.business.id).toBeTruthy();
  });

  it("plan does not influence ranking", async () => {
    await makeBusiness(db, { name: "Premium Weit", plan: "premium" });
    const near = await makeBusiness(db, { name: "Starter Nah", plan: "starter" });
    await db.execute(sql`update locations set lat = 52.5201, lng = 13.4051 where business_id = ${near.business.id}`);
    const rows = await discover(db, { lat: 52.52, lng: 13.405 });
    expect(rows[0].name).toBe("Starter Nah");
  });

  it("public profile hides unpublished businesses", async () => {
    const a = await makeBusiness(db);
    await db.update(businesses).set({ published: false }).where(eq(businesses.id, a.business.id));
    expect(await getBusinessPublic(db, a.business.slug)).toBeNull();
  });
});

describe("gdpr", () => {
  it("exports personal data without the password hash and deletes accounts with anonymised history", async () => {
    const { business, program } = await makeBusiness(db);
    const c = await makeUser(db, "customer");
    await db.transaction((tx) => awardStamps(tx, { programId: program.id, customerId: c.id, source: "manual" }));
    await setMarketingConsent(db, c.id, business.id, true, "test");
    const data = await exportPersonalData(db, c.id);
    expect(JSON.stringify(data)).not.toContain("scrypt$");
    expect(data.stampEvents).toHaveLength(1);
    expect(data.consentHistory).toHaveLength(1);

    await expect(deleteAccount(db, c.id, "falsch")).rejects.toMatchObject({ code: "invalid_credentials" });
    await deleteAccount(db, c.id, "passwort12345");
    const events = await db.select().from(stampEvents).where(eq(stampEvents.businessId, business.id));
    expect(events).toHaveLength(1);
    expect(events[0].customerId).toBeNull();
  });

  it("sole owners must delete their business first", async () => {
    const { owner } = await makeBusiness(db);
    await expect(deleteAccount(db, owner.id, "passwort12345")).rejects.toMatchObject({ code: "sole_owner" });
  });
});
