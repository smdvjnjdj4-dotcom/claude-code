import type { Attribute, DateKey, Difficulty, VybeData, XpEvent } from './types';
import { ATTRIBUTES } from './types';
import { addDays, todayKey } from '@/lib/date';

/**
 * Progression rules — the single source of truth for all rewards.
 * Rewards are intentionally modest and predictable:
 *  - Missions: by difficulty (see MISSION_XP). The attribute gains the same XP.
 *  - Habits:   15 XP per logged day.
 *  - Money:    +5 XP once per day for tracking, +20 XP once per day for saving.
 *  - Achievements: one-time bonus by rarity.
 * Daily soft cap: beyond DAILY_SOFT_CAP XP, rewards are halved — rest is progress, too.
 */
export const MISSION_XP: Record<Difficulty, number> = {
  easy: 20,
  normal: 30,
  challenging: 40,
  hard: 60,
  epic: 100,
};
export const HABIT_XP = 15;
export const TRACK_MONEY_XP = 5;
export const SAVE_MONEY_XP = 20;
export const DAILY_SOFT_CAP = 400;

/** XP required to advance from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  const l = level - 1;
  return 100 + l * 60 + l * l * 5;
}
/** Total XP needed to reach `level` from zero. */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpToNext(i);
  return total;
}

export interface LevelInfo {
  level: number;
  totalXp: number;
  intoLevel: number;
  needed: number;
  pct: number;
}
export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, totalXp);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  const needed = xpToNext(level);
  return { level, totalXp, intoLevel: rest, needed, pct: rest / needed };
}

export function attrXpToNext(level: number): number {
  return 50 + (level - 1) * 35;
}
export function attrLevelFromXp(xp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= attrXpToNext(level)) {
    rest -= attrXpToNext(level);
    level++;
  }
  const needed = attrXpToNext(level);
  return { level, totalXp: xp, intoLevel: rest, needed, pct: rest / needed };
}

export function totalXp(ledger: XpEvent[]): number {
  return ledger.reduce((s, e) => s + e.xp, 0);
}
export function attributeXp(ledger: XpEvent[]): Record<Attribute, number> {
  const out = Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as Record<Attribute, number>;
  for (const e of ledger) if (e.attribute) out[e.attribute] += e.attributeXp ?? e.xp;
  return out;
}
export function xpOnDay(ledger: XpEvent[], day: DateKey): number {
  return ledger.reduce((s, e) => (e.date === day ? s + e.xp : s), 0);
}

export const LEVEL_TITLES: { min: number; de: string; en: string }[] = [
  { min: 1, de: 'Funke', en: 'Spark' },
  { min: 3, de: 'Entdecker', en: 'Explorer' },
  { min: 5, de: 'Pfadfinder', en: 'Pathfinder' },
  { min: 8, de: 'Architekt', en: 'Architect' },
  { min: 12, de: 'Vorreiter', en: 'Vanguard' },
  { min: 17, de: 'Leuchtfeuer', en: 'Luminary' },
  { min: 25, de: 'Legende', en: 'Legend' },
];
export function levelTitle(level: number, lang: 'de' | 'en'): string {
  let t = LEVEL_TITLES[0];
  for (const x of LEVEL_TITLES) if (level >= x.min) t = x;
  return t[lang];
}

/** Visual customisations (auras) unlocked by character level. */
export const AURAS = [
  { id: 'violet', level: 1 },
  { id: 'cyan', level: 3 },
  { id: 'aurora', level: 5 },
  { id: 'solar', level: 8 },
  { id: 'nebula', level: 12 },
] as const;

// ---------------------------------------------------------------- awarding

export interface AwardInput {
  key: string;
  xp: number;
  label: string;
  attribute?: Attribute;
  date?: DateKey;
  now?: Date;
}

/**
 * Idempotently add an XP event. If an event with the same key exists, data is returned unchanged.
 * This is the protection against accidental duplicate rewards.
 */
export function award(data: VybeData, input: AwardInput): { data: VybeData; event: XpEvent | null } {
  if (data.ledger.some((e) => e.key === input.key)) return { data, event: null };
  const now = input.now ?? new Date();
  const date = input.date ?? todayKey(now);
  const already = xpOnDay(data.ledger, date);
  let xp = input.xp;
  if (already >= DAILY_SOFT_CAP) xp = Math.ceil(xp / 2);
  else if (already + xp > DAILY_SOFT_CAP) {
    const over = already + xp - DAILY_SOFT_CAP;
    xp = xp - over + Math.ceil(over / 2);
  }
  const event: XpEvent = {
    key: input.key,
    at: now.toISOString(),
    date,
    xp,
    attribute: input.attribute,
    attributeXp: input.attribute ? xp : undefined,
    label: input.label,
  };
  return { data: { ...data, ledger: [...data.ledger, event] }, event };
}

export function revoke(data: VybeData, key: string): VybeData {
  if (!data.ledger.some((e) => e.key === key)) return data;
  return { ...data, ledger: data.ledger.filter((e) => e.key !== key) };
}

// ---------------------------------------------------------------- streaks

export function activeDays(data: Pick<VybeData, 'ledger' | 'frozenDays'>): Set<DateKey> {
  const s = new Set<DateKey>();
  for (const e of data.ledger) if (!e.key.startsWith('ach:')) s.add(e.date);
  return s;
}

/**
 * Current streak: consecutive active (or frozen) days ending today.
 * If today has no activity yet the streak is still alive (counted through yesterday) —
 * you have the whole day to keep it.
 */
export function currentStreak(data: Pick<VybeData, 'ledger' | 'frozenDays'>, today: DateKey = todayKey()): number {
  const active = activeDays(data);
  const frozen = new Set(data.frozenDays);
  const ok = (d: DateKey) => active.has(d) || frozen.has(d);
  let day = ok(today) ? today : addDays(today, -1);
  let n = 0;
  while (ok(day)) {
    if (active.has(day)) n++;
    day = addDays(day, -1);
  }
  return n;
}

export function bestStreak(data: Pick<VybeData, 'ledger' | 'frozenDays'>): number {
  const active = activeDays(data);
  const frozen = new Set(data.frozenDays);
  const days = [...active].sort();
  let best = 0;
  const seen = new Set<DateKey>();
  for (const d of days) {
    if (seen.has(d)) continue;
    let n = 0;
    let cur = d;
    while (active.has(cur) || frozen.has(cur)) {
      seen.add(cur);
      if (active.has(cur)) n++;
      cur = addDays(cur, 1);
    }
    best = Math.max(best, n);
  }
  return best;
}

/**
 * Fair streak rules: every 7 active days in a row earns one streak freeze (max 2).
 * A freeze is automatically used for a single missed day so one bad day doesn't erase weeks of effort.
 */
export function reconcileStreak(data: VybeData, today: DateKey = todayKey()): VybeData {
  let next = data;
  const yesterday = addDays(today, -1);
  const before = addDays(today, -2);
  const active = activeDays(next);
  const frozen = new Set(next.frozenDays);
  const covered = (d: DateKey) => active.has(d) || frozen.has(d);
  if (!covered(yesterday) && covered(before) && next.streakFreezes > 0) {
    next = { ...next, streakFreezes: next.streakFreezes - 1, frozenDays: [...next.frozenDays, yesterday] };
  }
  const streak = currentStreak(next, today);
  if (active.has(today) && streak > 0 && streak % 7 === 0 && next.lastFreezeAward !== today && next.streakFreezes < 2) {
    next = { ...next, streakFreezes: next.streakFreezes + 1, lastFreezeAward: today };
  }
  return next;
}
