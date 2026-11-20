import type { OpeningHours } from "@/db/schema";
import { env } from "./env";

export const DAYS = [
  ["mon", "Montag"],
  ["tue", "Dienstag"],
  ["wed", "Mittwoch"],
  ["thu", "Donnerstag"],
  ["fri", "Freitag"],
  ["sat", "Samstag"],
  ["sun", "Sonntag"],
] as const;

/** Whether the location is open right now (platform timezone). Null if no hours are set. */
export function openNow(hours: OpeningHours | null | undefined, now = new Date(), tz = env.timezone): boolean | null {
  if (!hours) return null;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")!.value.toLowerCase().slice(0, 3) as keyof OpeningHours;
  const hm = `${parts.find((p) => p.type === "hour")!.value}:${parts.find((p) => p.type === "minute")!.value}`;
  return (hours[wd] ?? []).some((s) => (s.close > s.open ? hm >= s.open && hm < s.close : hm >= s.open || hm < s.close));
}

export function formatHours(slots: { open: string; close: string }[] | undefined) {
  return slots?.length ? slots.map((s) => `${s.open}–${s.close}`).join(", ") : "Geschlossen";
}
