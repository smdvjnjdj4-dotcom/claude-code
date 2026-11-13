import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVybe } from './useVybe';
import { attributeXp, attrLevelFromXp, bestStreak, currentStreak, levelFromXp, totalXp, xpOnDay } from '@/domain/progression';
import { isMissionDone, isMissionVisibleOn } from '@/domain/engine';
import { todayKey } from '@/lib/date';
import { ATTRIBUTES } from '@/domain/types';

export function useProgress() {
  const { ledger, frozenDays, streakFreezes } = useVybe(useShallow((s) => ({ ledger: s.ledger, frozenDays: s.frozenDays, streakFreezes: s.streakFreezes })));
  return useMemo(() => {
    const today = todayKey();
    const xp = totalXp(ledger);
    const level = levelFromXp(xp);
    const ax = attributeXp(ledger);
    const attributes = ATTRIBUTES.map((a) => ({ id: a, xp: ax[a], ...attrLevelFromXp(ax[a]) }));
    return {
      level,
      attributes,
      streak: currentStreak({ ledger, frozenDays }, today),
      best: bestStreak({ ledger, frozenDays }),
      xpToday: xpOnDay(ledger, today),
      freezes: streakFreezes,
    };
  }, [ledger, frozenDays, streakFreezes]);
}

export function useTodayMissions() {
  const missions = useVybe((s) => s.missions);
  return useMemo(() => {
    const today = todayKey();
    const list = missions.filter((m) => isMissionVisibleOn(m, today));
    const done = list.filter((m) => isMissionDone(m, today));
    return { list, done: done.length, total: list.length };
  }, [missions]);
}

export function useTodayHabits() {
  const habits = useVybe((s) => s.habits);
  return useMemo(() => {
    const today = todayKey();
    const list = habits.filter((h) => !h.archived);
    return { list, done: list.filter((h) => h.log[today]).length, total: list.length };
  }, [habits]);
}
