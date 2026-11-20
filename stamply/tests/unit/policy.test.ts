import { describe, expect, it } from "vitest";
import { evaluateMarketingSend, personalize, sanitizeInternalLink } from "@/domain/push/policy";
import { assessRisk, decide, merchantMatchScore, parseReceiptText, redactSensitive } from "@/domain/receipts/analyze";
import { can } from "@/lib/permissions";
import { entitlements } from "@/lib/plans";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { inQuietHours } from "@/lib/time";

const now = new Date("2026-11-20T12:00:00Z");
const base = { now, businessId: "b1", contentHash: "h1", consentGranted: true, userMarketingPaused: false, quietHours: false, recent: [] };
const h = (hours: number) => new Date(now.getTime() - hours * 3600_000);

describe("marketing send policy", () => {
  it("requires consent", () => {
    expect(evaluateMarketingSend({ ...base, consentGranted: false })).toEqual({ ok: false, reason: "no_consent" });
    expect(evaluateMarketingSend(base)).toEqual({ ok: true });
  });
  it("blocks quiet hours and paused users", () => {
    expect(evaluateMarketingSend({ ...base, quietHours: true })).toMatchObject({ reason: "quiet_hours" });
    expect(evaluateMarketingSend({ ...base, userMarketingPaused: true })).toMatchObject({ reason: "user_paused" });
  });
  it("blocks duplicates, enforces gaps and caps", () => {
    expect(evaluateMarketingSend({ ...base, recent: [{ businessId: "b2", contentHash: "h1", at: h(24 * 10) }] })).toMatchObject({ reason: "duplicate_content" });
    expect(evaluateMarketingSend({ ...base, recent: [{ businessId: "b1", contentHash: "x", at: h(47) }] })).toMatchObject({ reason: "business_min_gap" });
    expect(evaluateMarketingSend({ ...base, recent: [{ businessId: "b1", contentHash: "x", at: h(49) }] })).toEqual({ ok: true });
    const three = [h(50), h(100), h(150)].map((at, i) => ({ businessId: "b1", contentHash: `x${i}`, at }));
    expect(evaluateMarketingSend({ ...base, recent: three })).toMatchObject({ reason: "business_weekly_cap" });
    const platform = [1, 2, 3].map((i) => ({ businessId: `o${i}`, contentHash: `y${i}`, at: h(i) }));
    expect(evaluateMarketingSend({ ...base, recent: platform })).toMatchObject({ reason: "platform_daily_cap" });
  });
  it("only allows internal links", () => {
    expect(sanitizeInternalLink("/b/cafe-bohne")).toBe("/b/cafe-bohne");
    expect(sanitizeInternalLink("https://evil.example")).toBeNull();
    expect(sanitizeInternalLink("//evil.example")).toBeNull();
    expect(sanitizeInternalLink("javascript:alert(1)")).toBeNull();
  });
  it("personalizes", () => {
    expect(personalize("Hallo {vorname}!", "Anna Muster")).toBe("Hallo Anna!");
    expect(personalize("Hallo {vorname}!", "")).toBe("Hallo du!");
  });
});

describe("quiet hours", () => {
  it("handles windows across midnight in Europe/Berlin", () => {
    const q = { start: 21, end: 9 };
    expect(inQuietHours(new Date("2026-11-20T21:30:00Z"), q, "Europe/Berlin")).toBe(true); // 22:30 local
    expect(inQuietHours(new Date("2026-11-20T07:30:00Z"), q, "Europe/Berlin")).toBe(true); // 08:30
    expect(inQuietHours(new Date("2026-11-20T08:30:00Z"), q, "Europe/Berlin")).toBe(false); // 09:30
  });
});

describe("receipt parsing", () => {
  const text = "BÄCKEREI MÜLLER GmbH\nMarktplatz 3\n18.11.2026 08:42\n2x Brötchen 1,20\nKaffee 2,80\nMwSt 7% 0,26\nSUMME 4,00\nGegeben BAR 10,00\nRückgeld 6,00\nBon-Nr: 0815";
  it("extracts date, time, total and receipt number", () => {
    const p = parseReceiptText(text);
    expect(p).toMatchObject({ date: "2026-11-18", time: "08:42", amountCents: 400, amountFromTotalLine: true, receiptNo: "0815" });
  });
  it("matches merchant names with umlauts and aliases", () => {
    expect(merchantMatchScore(text, ["Bäckerei Müller"])).toBeGreaterThanOrEqual(0.9);
    expect(merchantMatchScore(text, ["Café Bohne"])).toBeLessThan(0.6);
  });
  it("scores risk and decides", () => {
    const p = parseReceiptText(text);
    const ok = assessRisk({ ocrAvailable: true, ocrConfidence: 90, merchantScore: 1, parsed: p, minPurchaseCents: 0, todayIso: "2026-11-19", duplicateOfApproved: false, submissionsLast24h: 0 });
    expect(ok.flags).toEqual([]);
    expect(decide(ok, "auto_low_risk")).toBe("auto_approve");
    expect(decide(ok, "always_manual")).toBe("review");
    const old = assessRisk({ ocrAvailable: true, ocrConfidence: 90, merchantScore: 1, parsed: p, minPurchaseCents: 0, todayIso: "2026-11-30", duplicateOfApproved: false, submissionsLast24h: 0 });
    expect(old.flags).toContain("date_too_old");
    expect(decide(old, "auto_low_risk")).toBe("review");
    const dup = assessRisk({ ocrAvailable: true, ocrConfidence: 90, merchantScore: 1, parsed: p, minPurchaseCents: 0, todayIso: "2026-11-19", duplicateOfApproved: true, submissionsLast24h: 0 });
    expect(decide(dup, "auto_low_risk")).toBe("auto_reject");
  });
  it("redacts card numbers and IBANs", () => {
    const r = redactSensitive("VISA 4111 1111 1111 1111\nIBAN DE89370400440532013000\nKarte ************1234");
    expect(r).not.toMatch(/4111/);
    expect(r).not.toMatch(/DE8937/);
    expect(r).not.toMatch(/1234/);
  });
});

describe("roles & plans", () => {
  it("permission matrix", () => {
    expect(can("owner", "billing.manage")).toBe(true);
    expect(can("manager", "billing.manage")).toBe(false);
    expect(can("manager", "campaigns.manage")).toBe(true);
    expect(can("staff", "stamps.issue")).toBe(true);
    expect(can("staff", "programs.manage")).toBe(false);
  });
  it("plan entitlements", () => {
    expect(entitlements("starter").manualPush).toBe(false);
    expect(entitlements("business").manualPush).toBe(true);
    expect(entitlements("business").advancedAutomations).toBe(false);
    expect(entitlements("premium").maxLocations).toBeGreaterThan(1);
  });
});

describe("geo", () => {
  it("computes distances", () => {
    const d = distanceMeters({ lat: 52.52, lng: 13.405 }, { lat: 48.1374, lng: 11.5755 });
    expect(Math.round(d / 1000)).toBe(504);
    expect(formatDistance(420)).toBe("420 m");
    expect(formatDistance(null)).toBeNull();
  });
});
