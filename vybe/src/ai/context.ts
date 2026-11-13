import type { VybeData } from '@/domain/types';
import { ATTRIBUTES } from '@/domain/types';
import type { CompanionContext } from './types';
import { attributeXp, currentStreak, levelFromXp, totalXp } from '@/domain/progression';
import { isMissionDone, isMissionVisibleOn } from '@/domain/engine';
import { habitStreak } from '@/domain/habits';
import { addDays, startOfWeek, todayKey } from '@/lib/date';

export function buildContext(d: VybeData): CompanionContext {
  const today = todayKey();
  const ax = attributeXp(d.ledger);
  const sorted = [...ATTRIBUTES].sort((a, b) => ax[a] - ax[b]);
  const focus = d.profile?.focusAreas ?? [];
  const weakest = sorted.find((a) => focus.includes(a)) ?? sorted[0];
  const ws = startOfWeek(today);
  const sumRange = (from: string, to: string) => d.ledger.filter((e) => e.date >= from && e.date <= to).reduce((s, e) => s + e.xp, 0);
  const visible = d.missions.filter((m) => isMissionVisibleOn(m, today));
  return {
    lang: d.settings.lang,
    name: d.profile?.name ?? '',
    goals: d.profile?.goals ?? [],
    focusAreas: focus,
    dailyMinutes: d.profile?.dailyMinutes ?? 30,
    motivations: d.profile?.motivations ?? [],
    level: levelFromXp(totalXp(d.ledger)).level,
    streak: currentStreak(d, today),
    todayOpenMissions: visible.filter((m) => !isMissionDone(m, today)).map((m) => m.title),
    todayDoneMissions: visible.filter((m) => isMissionDone(m, today)).map((m) => m.title),
    habits: d.habits.map((h) => ({ name: h.name, doneToday: !!h.log[today], streak: habitStreak(h).value })),
    weekXp: sumRange(ws, today),
    lastWeekXp: sumRange(addDays(ws, -7), addDays(ws, -1)),
    weakestAttribute: weakest,
    strongestAttribute: sorted[sorted.length - 1],
  };
}
