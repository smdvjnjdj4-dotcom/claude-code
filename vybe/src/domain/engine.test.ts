import { describe, expect, it } from 'vitest';
import { emptyData, starterMissions, starterHabits } from './content';
import { completeMission, uncompleteMission, stepMission, toggleHabit, addTransaction, contributeToGoal } from './engine';
import { award, currentStreak, DAILY_SOFT_CAP, levelFromXp, reconcileStreak, totalXp, xpForLevel, xpToNext } from './progression';
import { buildDemoData } from './demo';
import { validateImport, exportJson } from '@/store/importExport';
import type { Mission, VybeData } from './types';
import { addDays, todayKey } from '@/lib/date';
import { habitStreak } from './habits';
import { parseAmount } from '@/lib/format';
import { sanitize } from '@/ai/httpProvider';

const mission = (over: Partial<Mission> = {}): Mission => ({
  id: 'm1', title: 'Read', attribute: 'intelligence', difficulty: 'normal', recurrence: 'daily', target: 1, progress: {}, completed: {}, createdAt: '2020-01-01T00:00:00Z', ...over,
});
const withMission = (m: Mission): VybeData => ({ ...emptyData(), onboarded: true, missions: [m] });

describe('levels', () => {
  it('has increasing thresholds', () => {
    for (let l = 1; l < 30; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
  });
  it('computes level from xp consistently', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(xpForLevel(5)).level).toBe(5);
    expect(levelFromXp(xpForLevel(5) - 1).level).toBe(4);
  });
});

describe('missions', () => {
  it('awards XP once per day — duplicate completion is ignored', () => {
    const d0 = withMission(mission());
    const r1 = completeMission(d0, 'm1');
    const r2 = completeMission(r1.data, 'm1');
    const missionXp = (d: VybeData) => d.ledger.filter((e) => e.key.startsWith('mission:')).reduce((s, e) => s + e.xp, 0);
    expect(missionXp(r1.data)).toBe(30);
    expect(missionXp(r2.data)).toBe(30);
    expect(r2.gained).toHaveLength(0);
  });
  it('undo revokes exactly the mission XP', () => {
    const r1 = completeMission(withMission(mission()), 'm1');
    const r2 = uncompleteMission(r1.data, 'm1');
    expect(r2.data.ledger.some((e) => e.key.startsWith('mission:'))).toBe(false);
  });
  it('attribute receives the mission XP', () => {
    const r = completeMission(withMission(mission({ difficulty: 'hard', attribute: 'fitness' })), 'm1');
    const e = r.data.ledger.find((x) => x.key.startsWith('mission:'))!;
    expect(e.attribute).toBe('fitness');
    expect(e.attributeXp).toBe(60);
  });
  it('multi-step missions complete at target', () => {
    let d = withMission(mission({ target: 3 }));
    d = stepMission(d, 'm1', 1).data;
    d = stepMission(d, 'm1', 1).data;
    expect(d.ledger.length).toBe(0);
    d = stepMission(d, 'm1', 1).data;
    expect(d.missions[0].completed[todayKey()]).toBe(true);
  });
  it('one-off missions reward once overall', () => {
    const d = withMission(mission({ recurrence: 'once', date: todayKey() }));
    const r = completeMission(d, 'm1');
    const again = completeMission(r.data, 'm1', addDays(todayKey(), 1));
    expect(again.data.ledger.filter((e) => e.key.startsWith('mission:'))).toHaveLength(1);
  });
});

describe('soft cap', () => {
  it('halves rewards beyond the daily cap', () => {
    let d = emptyData();
    d = award(d, { key: 'a', xp: DAILY_SOFT_CAP, label: 'x' }).data;
    const r = award(d, { key: 'b', xp: 40, label: 'y' });
    expect(r.event!.xp).toBe(20);
  });
});

describe('streaks', () => {
  it('counts consecutive active days and survives an open today', () => {
    let d = withMission(mission());
    const today = todayKey();
    for (let i = 1; i <= 3; i++) d = completeMission(d, 'm1', addDays(today, -i)).data;
    expect(currentStreak(d, today)).toBe(3);
  });
  it('a freeze bridges one missed day', () => {
    let d: VybeData = { ...withMission(mission()), streakFreezes: 1 };
    const today = todayKey();
    for (let i = 2; i <= 4; i++) d = completeMission(d, 'm1', addDays(today, -i)).data;
    d = reconcileStreak(d, today);
    expect(d.streakFreezes).toBe(0);
    expect(currentStreak(d, today)).toBe(3);
  });
  it('earns a freeze at 7 days, only once that day', () => {
    let d = withMission(mission());
    const today = todayKey();
    for (let i = 6; i >= 0; i--) d = completeMission(d, 'm1', addDays(today, -i)).data;
    d = reconcileStreak(reconcileStreak(d, today), today);
    expect(d.streakFreezes).toBe(1);
  });
});

describe('habits & money', () => {
  it('toggling a habit twice nets zero XP', () => {
    const d = { ...emptyData(), habits: [{ id: 'h', name: 'Read', icon: 'BookOpen', attribute: 'intelligence' as const, weeklyTarget: 7, color: 'violet' as const, log: {}, createdAt: '2020-01-01' }] };
    const a = toggleHabit(d, 'h');
    const b = toggleHabit(a.data, 'h');
    expect(totalXp(b.data.ledger.filter((e) => !e.key.startsWith('ach:')))).toBe(0);
    expect(habitStreak(a.data.habits[0]).value).toBe(1);
  });
  it('money tracking XP is granted once per day', () => {
    let d = emptyData();
    d = addTransaction(d, { type: 'expense', amount: 500, currency: 'EUR', category: 'food', date: todayKey(), source: 'manual' }).data;
    d = addTransaction(d, { type: 'expense', amount: 700, currency: 'EUR', category: 'food', date: todayKey(), source: 'manual' }).data;
    expect(d.transactions).toHaveLength(2);
    expect(d.ledger.filter((e) => e.key.startsWith('track:'))).toHaveLength(1);
  });
  it('unlocks the goal achievement when a savings goal is reached', () => {
    let d: VybeData = { ...emptyData(), savings: [{ id: 's', name: 'Bike', target: 1000, saved: 0, currency: 'EUR', createdAt: '' }] };
    const r = contributeToGoal(d, 's', 1000);
    d = r.data;
    expect(r.unlocked.map((a) => a.id)).toContain('goal_reached');
    expect(d.ledger.filter((e) => e.key === 'ach:goal_reached')).toHaveLength(1);
  });
  it('parses German and English amounts', () => {
    expect(parseAmount('12,50')).toBe(1250);
    expect(parseAmount('1.234,56')).toBe(123456);
    expect(parseAmount('1,234.56')).toBe(123456);
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
  });
});

describe('onboarding, demo and data portability', () => {
  it('creates starter content scaled to daily time', () => {
    const p = { name: 'A', goals: [], focusAreas: ['fitness' as const, 'finance' as const], dailyMinutes: 15, motivations: [], createdAt: '', isDemo: false };
    expect(starterMissions(p, 'de')).toHaveLength(3);
    expect(starterMissions({ ...p, dailyMinutes: 120 }, 'en')).toHaveLength(4); // only 2 templates per area × 2 areas
    expect(starterHabits(p, 'de')).toHaveLength(2);
  });
  it('demo data is flagged and consistent', () => {
    const d = buildDemoData('de');
    expect(d.profile?.isDemo).toBe(true);
    expect(d.transactions.every((t) => t.source === 'demo')).toBe(true);
    expect(totalXp(d.ledger)).toBeGreaterThan(0);
  });
  it('export → import round-trips; garbage is rejected', () => {
    const d = buildDemoData('en');
    const r = validateImport(exportJson(d));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.ledger.length).toBe(d.ledger.length);
    expect(validateImport('{"hello":1}').ok).toBe(false);
    expect(validateImport('not json').ok).toBe(false);
  });
  it('sanitizes AI proposals', () => {
    const out = sanitize([{ title: 'Go for a run', attribute: 'fitness', difficulty: 'hard' }, { title: '', attribute: 'x' }, 'bad', { title: 'Hack', attribute: 'nope', difficulty: 'ultra', recurrence: 'daily' }]);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ title: 'Hack', attribute: 'discipline', difficulty: 'normal', recurrence: 'daily' });
  });
});
