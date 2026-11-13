import type { Lang, Profile, VybeData } from './types';
import { emptyData, habitFromTemplate, HABIT_TEMPLATES, MISSION_TEMPLATES, missionFromTemplate, demoChallenges } from './content';
import { completeMission, toggleHabit } from './engine';
import { addDays, todayKey } from '@/lib/date';
import { uid } from '@/lib/id';

/**
 * Builds a demo profile with ~3 weeks of example history. Everything here is clearly flagged
 * as demo data in the UI (profile.isDemo) and can be reset at any time.
 * Uses a seeded PRNG so the demo looks the same on every device.
 */
export function buildDemoData(lang: Lang): VybeData {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const today = todayKey();
  const start = addDays(today, -20);
  const profile: Profile = {
    name: 'Alex',
    goals: lang === 'de' ? ['Fitter werden', 'Mehr lesen', 'Notgroschen aufbauen'] : ['Get fitter', 'Read more', 'Build an emergency fund'],
    focusAreas: ['fitness', 'intelligence', 'finance', 'discipline'],
    dailyMinutes: 45,
    motivations: ['growth', 'health'],
    createdAt: new Date(start).toISOString(),
    isDemo: true,
  };
  let data: VybeData = { ...emptyData(lang), onboarded: true, profile };
  const created = `${start}T08:00:00.000Z`;
  const missions = [
    MISSION_TEMPLATES.intelligence[0], MISSION_TEMPLATES.fitness[0], MISSION_TEMPLATES.discipline[0],
    MISSION_TEMPLATES.finance[1], MISSION_TEMPLATES.creativity[0], MISSION_TEMPLATES.fitness[1],
  ].map((t) => ({ ...missionFromTemplate({ ...t, recurrence: 'daily' }, lang, 'demo'), createdAt: created }));
  const habits = (['intelligence', 'fitness', 'discipline', 'social'] as const).map((a) => ({ ...habitFromTemplate(HABIT_TEMPLATES[a], lang), createdAt: created }));
  data = { ...data, missions, habits };

  for (let i = 0; i <= 20; i++) {
    const day = addDays(start, i);
    const isToday = day === today;
    if (rand() < 0.1 && !isToday) continue; // the occasional rest day
    for (const m of data.missions) {
      if (isToday) break; // leave today open for the user
      if (rand() < 0.62) data = completeMission(data, m.id, day).data;
    }
    for (const h of data.habits) {
      if (isToday) break;
      const p = h.weeklyTarget / 7;
      if (rand() < p * 0.85) data = toggleHabit(data, h.id, day).data;
    }
  }

  const tx = (type: 'income' | 'expense', eur: number, category: string, offset: number, note?: string) => ({
    id: uid('t'), type, amount: Math.round(eur * 100), currency: 'EUR', category, note, date: addDays(today, -offset), source: 'demo' as const,
  });
  data.transactions = [
    tx('income', 2650, 'salary', 12, lang === 'de' ? 'Gehalt' : 'Salary'),
    tx('expense', 890, 'housing', 12, lang === 'de' ? 'Miete' : 'Rent'),
    tx('expense', 64.3, 'food', 1), tx('expense', 23.9, 'food', 3), tx('expense', 41.5, 'food', 6),
    tx('expense', 49, 'transport', 10, 'Deutschlandticket'),
    tx('expense', 12.99, 'subscriptions', 8, 'Streaming'),
    tx('expense', 38, 'leisure', 4, lang === 'de' ? 'Konzert' : 'Concert'),
    tx('expense', 79.9, 'shopping', 5),
    tx('income', 120, 'side', 2, 'Freelance'),
  ];
  data.budgets = [ { category: 'food', limit: 30000 }, { category: 'leisure', limit: 12000 }, { category: 'shopping', limit: 10000 } ];
  data.savings = [
    { id: uid('s'), name: lang === 'de' ? 'Notgroschen' : 'Emergency fund', target: 300000, saved: 112000, currency: 'EUR', createdAt: created },
    { id: uid('s'), name: lang === 'de' ? 'Neues Fahrrad' : 'New bike', target: 90000, saved: 31000, currency: 'EUR', deadline: addDays(today, 90), createdAt: created },
  ];
  data.challenges = demoChallenges(lang);
  data.friends = [ { id: uid('f'), name: 'Mira', addedAt: created, kind: 'demo' }, { id: uid('f'), name: 'Jonas', addedAt: created, kind: 'demo' } ];
  // Achievements earned by history are recorded silently (no popups); keep today's XP clean for the user.
  const yesterday = addDays(today, -1);
  data.ledger = data.ledger.map((e) => (e.key.startsWith('ach:') && e.date === today ? { ...e, date: yesterday } : e));
  return data;
}
