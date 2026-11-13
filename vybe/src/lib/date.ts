import type { DateKey } from '@/domain/types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}
export function fromKey(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k: DateKey, n: number): DateKey {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86400000);
}
/** Monday-based start of week */
export function startOfWeek(k: DateKey): DateKey {
  const d = fromKey(k);
  const dow = (d.getDay() + 6) % 7;
  return addDays(k, -dow);
}
export function lastNDays(n: number, end: DateKey = todayKey()): DateKey[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}
export function monthKey(k: DateKey): string {
  return k.slice(0, 7);
}
