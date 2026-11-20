import { env } from "./env";

/** Local calendar date (YYYY-MM-DD) in the platform timezone. */
export function localDate(d = new Date(), tz = env.timezone): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Local hour 0–23 in the platform timezone. */
export function localHour(d = new Date(), tz = env.timezone): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(d);
  return Number(h);
}

export function inQuietHours(d: Date, quiet = env.quietHours, tz = env.timezone): boolean {
  const h = localHour(d, tz);
  return quiet.start > quiet.end ? h >= quiet.start || h < quiet.end : h >= quiet.start && h < quiet.end;
}

export const daysAgo = (n: number, from = new Date()) => new Date(from.getTime() - n * 86400_000);

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  if (!d) return "–";
  return new Intl.DateTimeFormat("de-DE", { timeZone: env.timezone, ...opts }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined) {
  return formatDate(d, { dateStyle: "medium", timeStyle: "short" });
}

export function relativeTime(d: Date | string, now = new Date()) {
  const diff = (new Date(d).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(d);
}

export const formatEuro = (cents: number | null | undefined) =>
  cents == null ? "–" : new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
