/**
 * Pure receipt analysis: field extraction from OCR text and risk scoring.
 * IMPORTANT: OCR is a convenience signal, never proof. Anything uncertain goes to human review.
 */

export type ParsedReceipt = {
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  amountCents: number | null;
  amountFromTotalLine: boolean;
  receiptNo: string | null;
};

const TOTAL_KEYWORDS = /(summe|gesamt|total|zu zahlen|zahlbetrag|betrag|endbetrag|ec[- ]?karte|girocard|kartenzahlung)/i;
const AMOUNT_RE = /(?<![\d,.])(\d{1,5})[.,](\d{2})(?![\d])/g;

export function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toIsoDate(d: number, m: number, y: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return dt.toISOString().slice(0, 10);
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let date: string | null = null;
  for (const l of lines) {
    const m =
      l.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})\b/) ??
      null;
    const iso = l.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) {
      date = toIsoDate(+iso[3], +iso[2], +iso[1]);
    } else if (m) {
      date = toIsoDate(+m[1], +m[2], +m[3]);
    }
    if (date) break;
  }

  const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
  const time = timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : null;

  // Prefer amounts on "total" lines; take the largest there (VAT lines are smaller).
  let best: number | null = null;
  let fromTotal = false;
  for (const l of lines) {
    if (!TOTAL_KEYWORDS.test(l) || /mwst|ust|netto|steuer|rückgeld|rueckgeld|gegeben/i.test(l)) continue;
    for (const a of l.matchAll(AMOUNT_RE)) {
      const cents = +a[1] * 100 + +a[2];
      if (best === null || cents > best) best = cents;
      fromTotal = true;
    }
  }
  if (best === null) {
    for (const a of text.matchAll(AMOUNT_RE)) {
      const cents = +a[1] * 100 + +a[2];
      if (best === null || cents > best) best = cents;
    }
  }

  const noMatch = text.match(
    /(?:bon|beleg|rechnung|rg|quittung|transaktion|trans|ta|vorgang)[\s.-]*(?:nr|nummer|no|#)?[\s.:#-]*([a-z0-9][a-z0-9/-]{2,19})/i,
  );
  const receiptNo = noMatch && /\d/.test(noMatch[1]) ? noMatch[1].toUpperCase() : null;

  return { date, time, amountCents: best, amountFromTotalLine: fromTotal, receiptNo };
}

/** How well the business name (or an alias) appears in the receipt header. 0..1 */
export function merchantMatchScore(text: string, names: string[]): number {
  const head = normalizeText(text.split(/\r?\n/).slice(0, 12).join(" "));
  const all = normalizeText(text);
  let best = 0;
  for (const name of names) {
    const tokens = normalizeText(name).split(" ").filter((t) => t.length >= 3);
    if (!tokens.length) continue;
    const inHead = tokens.filter((t) => head.includes(t)).length / tokens.length;
    const inAll = tokens.filter((t) => all.includes(t)).length / tokens.length;
    best = Math.max(best, inHead, inAll * 0.8);
  }
  return Math.round(best * 100) / 100;
}

/** Removes payment-card numbers, IBANs and auth codes before anything is stored. */
export function redactSensitive(text: string): string {
  return text
    .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/gi, "[IBAN entfernt]")
    .replace(/(?:\d[ -]?){12,19}/g, "[Nummer entfernt]")
    .replace(/(?:x{4,}|\*{4,})[ -]?\d{2,4}/gi, "[Karte entfernt]")
    .replace(/((?:genehmigungs|autorisierungs|auth)[a-z-]*\s*(?:nr|code)?[.:\s]*)\S+/gi, "$1[entfernt]")
    .slice(0, 4000);
}

export type RiskFlag =
  | "ocr_unavailable"
  | "low_ocr_confidence"
  | "merchant_not_found"
  | "date_missing"
  | "date_in_future"
  | "date_too_old"
  | "amount_missing"
  | "amount_uncertain"
  | "below_min_purchase"
  | "duplicate_receipt"
  | "high_submission_rate";

export const RISK_LABELS: Record<RiskFlag, string> = {
  ocr_unavailable: "Texterkennung nicht möglich",
  low_ocr_confidence: "Text schlecht lesbar",
  merchant_not_found: "Geschäftsname nicht gefunden",
  date_missing: "Kein Datum erkannt",
  date_in_future: "Datum liegt in der Zukunft",
  date_too_old: "Bon ist zu alt",
  amount_missing: "Kein Betrag erkannt",
  amount_uncertain: "Betrag unsicher erkannt",
  below_min_purchase: "Mindestumsatz nicht erreicht",
  duplicate_receipt: "Bon wurde bereits eingereicht",
  high_submission_rate: "Viele Einreichungen in kurzer Zeit",
};

const WEIGHTS: Record<RiskFlag, number> = {
  ocr_unavailable: 50,
  low_ocr_confidence: 30,
  merchant_not_found: 45,
  date_missing: 35,
  date_in_future: 80,
  date_too_old: 60,
  amount_missing: 25,
  amount_uncertain: 15,
  below_min_purchase: 50,
  duplicate_receipt: 100,
  high_submission_rate: 40,
};

export const MAX_RECEIPT_AGE_DAYS = 3;
export const AUTO_APPROVE_MAX_SCORE = 20;

export type RiskInput = {
  ocrAvailable: boolean;
  ocrConfidence: number | null; // 0..100
  merchantScore: number; // 0..1
  parsed: ParsedReceipt;
  minPurchaseCents: number;
  todayIso: string; // local date YYYY-MM-DD
  duplicateOfApproved: boolean;
  submissionsLast24h: number;
};

export function assessRisk(i: RiskInput): { score: number; flags: RiskFlag[] } {
  const flags: RiskFlag[] = [];
  if (!i.ocrAvailable) flags.push("ocr_unavailable");
  else {
    if ((i.ocrConfidence ?? 0) < 55) flags.push("low_ocr_confidence");
    if (i.merchantScore < 0.6) flags.push("merchant_not_found");
    if (!i.parsed.date) flags.push("date_missing");
    else {
      const ageDays = (Date.parse(i.todayIso) - Date.parse(i.parsed.date)) / 86400_000;
      if (ageDays < 0) flags.push("date_in_future");
      else if (ageDays > MAX_RECEIPT_AGE_DAYS) flags.push("date_too_old");
    }
    if (i.parsed.amountCents == null) {
      if (i.minPurchaseCents > 0) flags.push("amount_missing");
    } else {
      if (!i.parsed.amountFromTotalLine) flags.push("amount_uncertain");
      if (i.parsed.amountCents < i.minPurchaseCents) flags.push("below_min_purchase");
    }
  }
  if (i.duplicateOfApproved) flags.push("duplicate_receipt");
  if (i.submissionsLast24h >= 3) flags.push("high_submission_rate");
  const score = Math.min(100, flags.reduce((s, f) => s + WEIGHTS[f], 0));
  return { score, flags };
}

export type Decision = "auto_approve" | "auto_reject" | "review";

export function decide(
  risk: { score: number; flags: RiskFlag[] },
  mode: "auto_low_risk" | "always_manual",
): Decision {
  if (risk.flags.includes("duplicate_receipt") || risk.flags.includes("date_in_future")) return "auto_reject";
  if (mode === "always_manual") return "review";
  return risk.score <= AUTO_APPROVE_MAX_SCORE && !risk.flags.includes("ocr_unavailable") ? "auto_approve" : "review";
}

/** Stable fingerprint of the paper receipt (independent of the photo). Null if too little data. */
export function receiptFingerprintParts(businessId: string, p: ParsedReceipt): string | null {
  if (!p.date || p.amountCents == null || (!p.time && !p.receiptNo)) return null;
  return [businessId, p.date, p.time ?? "", p.amountCents, p.receiptNo ?? ""].join("|");
}
