import type { DateKey, Habit } from './types';
import { addDays, lastNDays, startOfWeek, todayKey } from '@/lib/date';

export function isDaily(h: Habit) {
  return h.weeklyTarget >= 7;
}

export function countInWeek(h: Habit, weekStart: DateKey): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (h.log[addDays(weekStart, i)]) n++;
  return n;
}

/**
 * Habit streak. Daily habits: consecutive logged days (today may still be open).
 * Weekly habits (target < 7): consecutive weeks that met the target (current week counts once met).
 */
export function habitStreak(h: Habit, today: DateKey = todayKey()): { value: number; unit: 'days' | 'weeks' } {
  if (isDaily(h)) {
    let d = h.log[today] ? today : addDays(today, -1);
    let n = 0;
    while (h.log[d]) {
      n++;
      d = addDays(d, -1);
    }
    return { value: n, unit: 'days' };
  }
  let week = startOfWeek(today);
  let n = 0;
  if (countInWeek(h, week) >= h.weeklyTarget) n++;
  week = addDays(week, -7);
  while (countInWeek(h, week) >= h.weeklyTarget) {
    n++;
    week = addDays(week, -7);
  }
  return { value: n, unit: 'weeks' };
}

export function bestHabitStreakDays(h: Habit): number {
  const days = Object.keys(h.log).sort();
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** Completion rate over the last `days` days relative to the weekly target. */
export function completionRate(h: Habit, days = 30, today: DateKey = todayKey()): number {
  const range = lastNDays(days, today).filter((d) => d >= h.createdAt.slice(0, 10));
  if (range.length === 0) return 0;
  const done = range.filter((d) => h.log[d]).length;
  const expected = (range.length * Math.min(7, h.weeklyTarget)) / 7;
  return Math.min(1, done / Math.max(1, expected));
}
