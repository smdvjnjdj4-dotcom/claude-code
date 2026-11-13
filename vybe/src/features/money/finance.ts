import type { Budget, Transaction } from '@/domain/types';
import { monthKey } from '@/lib/date';

export interface MonthSummary {
  income: number;
  expense: number;
  balance: number;
  byCategory: { category: string; amount: number }[];
  otherCurrencyCount: number;
}

/** Totals for one month in the base currency. Other currencies are counted but never silently converted. */
export function summarize(txs: Transaction[], month: string, currency: string): MonthSummary {
  let income = 0;
  let expense = 0;
  let other = 0;
  const cats = new Map<string, number>();
  for (const t of txs) {
    if (monthKey(t.date) !== month) continue;
    if (t.currency !== currency) { other++; continue; }
    if (t.type === 'income') income += t.amount;
    else {
      expense += t.amount;
      cats.set(t.category, (cats.get(t.category) ?? 0) + t.amount);
    }
  }
  const byCategory = [...cats.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  return { income, expense, balance: income - expense, byCategory, otherCurrencyCount: other };
}

export function budgetUsage(budgets: Budget[], summary: MonthSummary) {
  return budgets.map((b) => {
    const spent = summary.byCategory.find((c) => c.category === b.category)?.amount ?? 0;
    return { ...b, spent, pct: b.limit ? spent / b.limit : 0 };
  });
}

export function prevMonth(m: string): string {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function nextMonth(m: string): string {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
