import type { Lang } from '@/domain/types';

const locale = (l: Lang) => (l === 'de' ? 'de-DE' : 'en-US');

export function formatMoney(minor: number, currency: string, lang: Lang, hide = false): string {
  if (hide) return '•••';
  try {
    return new Intl.NumberFormat(locale(lang), { style: 'currency', currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}
export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(locale(lang)).format(Math.round(n));
}
export function formatDate(k: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  const [y, m, d] = k.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(lang), opts).format(new Date(y, m - 1, d));
}
/** Parse user-entered amount like "12,50" or "12.50" into minor units. Returns null if invalid. */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(/\s/g, '').replace(/€|\$|£/g, '');
  if (!s) return null;
  let norm = s;
  if (s.includes(',') && s.includes('.')) norm = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes(',')) norm = s.replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(norm)) return null;
  const v = Math.round(parseFloat(norm) * 100);
  return v > 0 && v < 1e11 ? v : null;
}
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'SEK', 'JPY'];
