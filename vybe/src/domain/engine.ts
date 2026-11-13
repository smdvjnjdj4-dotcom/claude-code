/**
 * Business logic for all state-changing actions. Pure functions: (data, input) -> result.
 * The Zustand store only calls these and persists the outcome — keeping UI and rules separate.
 */
import type { DateKey, Habit, Mission, SavingsGoal, Transaction, VybeData, XpEvent } from './types';
import { HABIT_XP, MISSION_XP, SAVE_MONEY_XP, TRACK_MONEY_XP, award, reconcileStreak, revoke } from './progression';
import { ACHIEVEMENTS, RARITY_BONUS, newlyUnlocked, type AchievementDef } from './achievements';
import { todayKey } from '@/lib/date';
import { uid } from '@/lib/id';

export interface ActionResult {
  data: VybeData;
  gained: XpEvent[];
  unlocked: AchievementDef[];
}

export const missionDayKey = (m: Mission, day: DateKey) => (m.recurrence === 'daily' ? day : 'once');
export const missionXpKey = (m: Mission, day: DateKey) => `mission:${m.id}:${missionDayKey(m, day)}`;

export function isMissionVisibleOn(m: Mission, day: DateKey): boolean {
  if (m.archived) return false;
  if (m.recurrence === 'daily') return m.createdAt.slice(0, 10) <= day;
  // One-off missions carry over until completed, then show only on the day they were done.
  if (m.completed.once) return m.doneOn === day;
  return (m.date ?? day) <= day;
}
export function isMissionDone(m: Mission, day: DateKey): boolean {
  return !!m.completed[missionDayKey(m, day)];
}
export function missionProgress(m: Mission, day: DateKey): number {
  return m.progress[missionDayKey(m, day)] ?? 0;
}

/** Run after every action: streak bookkeeping and achievement unlocks (each bonus awarded once). */
export function finalize(data: VybeData, gained: XpEvent[] = [], today: DateKey = todayKey()): ActionResult {
  let next = reconcileStreak(data, today);
  const unlocked = newlyUnlocked(next);
  for (const a of unlocked) {
    next = { ...next, achievements: [...next.achievements, { id: a.id, at: new Date().toISOString() }] };
    const r = award(next, { key: `ach:${a.id}`, xp: RARITY_BONUS[a.rarity], label: `achievement:${a.id}`, date: today });
    next = r.data;
    if (r.event) gained.push(r.event);
  }
  return { data: next, gained, unlocked };
}

function replaceMission(data: VybeData, m: Mission): VybeData {
  return { ...data, missions: data.missions.map((x) => (x.id === m.id ? m : x)) };
}

export function completeMission(data: VybeData, id: string, day: DateKey = todayKey()): ActionResult {
  const m = data.missions.find((x) => x.id === id);
  if (!m || isMissionDone(m, day)) return { data, gained: [], unlocked: [] };
  const k = missionDayKey(m, day);
  const updated: Mission = { ...m, completed: { ...m.completed, [k]: true }, progress: { ...m.progress, [k]: m.target }, doneOn: m.recurrence === 'once' ? day : m.doneOn };
  let next = replaceMission(data, updated);
  const r = award(next, { key: missionXpKey(m, day), xp: MISSION_XP[m.difficulty], attribute: m.attribute, label: m.title, date: day });
  next = r.data;
  return finalize(next, r.event ? [r.event] : [], day);
}

export function uncompleteMission(data: VybeData, id: string, day: DateKey = todayKey()): ActionResult {
  const m = data.missions.find((x) => x.id === id);
  if (!m || !isMissionDone(m, day)) return { data, gained: [], unlocked: [] };
  const k = missionDayKey(m, day);
  const completed = { ...m.completed };
  delete completed[k];
  const progress = { ...m.progress, [k]: Math.max(0, m.target - 1) };
  let next = replaceMission(data, { ...m, completed, progress, doneOn: m.recurrence === 'once' ? undefined : m.doneOn });
  next = revoke(next, missionXpKey(m, day));
  return { data: next, gained: [], unlocked: [] };
}

/** Increment progress on multi-step missions; completes automatically at target. */
export function stepMission(data: VybeData, id: string, delta: 1 | -1, day: DateKey = todayKey()): ActionResult {
  const m = data.missions.find((x) => x.id === id);
  if (!m) return { data, gained: [], unlocked: [] };
  const k = missionDayKey(m, day);
  const cur = m.progress[k] ?? 0;
  const val = Math.max(0, Math.min(m.target, cur + delta));
  if (val >= m.target) return completeMission(data, id, day);
  if (isMissionDone(m, day) && val < m.target) {
    const r = uncompleteMission(data, id, day);
    const mm = r.data.missions.find((x) => x.id === id)!;
    return { ...r, data: replaceMission(r.data, { ...mm, progress: { ...mm.progress, [k]: val } }) };
  }
  return { data: replaceMission(data, { ...m, progress: { ...m.progress, [k]: val } }), gained: [], unlocked: [] };
}

export function upsertMission(data: VybeData, m: Mission): VybeData {
  return data.missions.some((x) => x.id === m.id) ? replaceMission(data, m) : { ...data, missions: [m, ...data.missions] };
}

/** Deleting a mission keeps earned XP (history is honest), but it no longer appears. */
export function deleteMission(data: VybeData, id: string): VybeData {
  return { ...data, missions: data.missions.filter((m) => m.id !== id) };
}

export const habitXpKey = (h: Habit, day: DateKey) => `habit:${h.id}:${day}`;

export function toggleHabit(data: VybeData, id: string, day: DateKey = todayKey()): ActionResult {
  const h = data.habits.find((x) => x.id === id);
  if (!h) return { data, gained: [], unlocked: [] };
  const log = { ...h.log };
  let next: VybeData;
  if (log[day]) {
    delete log[day];
    next = { ...data, habits: data.habits.map((x) => (x.id === id ? { ...h, log } : x)) };
    next = revoke(next, habitXpKey(h, day));
    return { data: next, gained: [], unlocked: [] };
  }
  log[day] = true;
  next = { ...data, habits: data.habits.map((x) => (x.id === id ? { ...h, log } : x)) };
  const r = award(next, { key: habitXpKey(h, day), xp: HABIT_XP, attribute: h.attribute, label: h.name, date: day });
  return finalize(r.data, r.event ? [r.event] : [], todayKey());
}

export function addTransaction(data: VybeData, tx: Omit<Transaction, 'id'>): ActionResult {
  const t: Transaction = { ...tx, id: uid('t') };
  let next: VybeData = { ...data, transactions: [t, ...data.transactions] };
  const r = award(next, { key: `track:${todayKey()}`, xp: TRACK_MONEY_XP, attribute: 'finance', label: 'money:track' });
  next = r.data;
  return finalize(next, r.event ? [r.event] : []);
}

export function deleteTransaction(data: VybeData, id: string): VybeData {
  return { ...data, transactions: data.transactions.filter((t) => t.id !== id) };
}

export function contributeToGoal(data: VybeData, goalId: string, amount: number): ActionResult {
  const g = data.savings.find((x) => x.id === goalId);
  if (!g || amount === 0) return { data, gained: [], unlocked: [] };
  const updated: SavingsGoal = { ...g, saved: Math.max(0, g.saved + amount) };
  let next: VybeData = { ...data, savings: data.savings.map((x) => (x.id === goalId ? updated : x)) };
  if (amount > 0) {
    const r = award(next, { key: `save:${todayKey()}`, xp: SAVE_MONEY_XP, attribute: 'finance', label: 'money:save' });
    next = r.data;
    return finalize(next, r.event ? [r.event] : []);
  }
  return { data: next, gained: [], unlocked: [] };
}

export function achievementDef(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
