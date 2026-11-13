import type { Attribute, Difficulty, Habit, Lang, Mission, Profile, Settings, VybeData } from './types';
import { uid } from '@/lib/id';
import { addDays, todayKey } from '@/lib/date';

type T = { de: string; en: string };
interface MissionTemplate { title: T; attribute: Attribute; difficulty: Difficulty; recurrence: 'once' | 'daily'; target?: number }
interface HabitTemplate { name: T; icon: string; attribute: Attribute; weeklyTarget: number; color: Habit['color'] }

export const MISSION_TEMPLATES: Record<Attribute, MissionTemplate[]> = {
  discipline: [
    { title: { de: 'Tag in 5 Minuten planen', en: 'Plan your day in 5 minutes' }, attribute: 'discipline', difficulty: 'easy', recurrence: 'daily' },
    { title: { de: '60 Minuten Fokusblock ohne Handy', en: '60-minute phone-free focus block' }, attribute: 'discipline', difficulty: 'challenging', recurrence: 'daily' },
  ],
  intelligence: [
    { title: { de: '20 Minuten lesen', en: 'Read for 20 minutes' }, attribute: 'intelligence', difficulty: 'normal', recurrence: 'daily' },
    { title: { de: 'Etwas Neues lernen & notieren', en: 'Learn something new & write it down' }, attribute: 'intelligence', difficulty: 'challenging', recurrence: 'once' },
  ],
  fitness: [
    { title: { de: 'Workout absolvieren', en: 'Complete a workout' }, attribute: 'fitness', difficulty: 'hard', recurrence: 'daily' },
    { title: { de: '2 Liter Wasser trinken', en: 'Drink 2 litres of water' }, attribute: 'fitness', difficulty: 'easy', recurrence: 'daily', target: 4 },
  ],
  finance: [
    { title: { de: '10 € zur Seite legen', en: 'Save €10' }, attribute: 'finance', difficulty: 'challenging', recurrence: 'once' },
    { title: { de: 'Ausgaben des Tages erfassen', en: "Log today's expenses" }, attribute: 'finance', difficulty: 'easy', recurrence: 'daily' },
  ],
  creativity: [
    { title: { de: '15 Minuten kreativ arbeiten', en: '15 minutes of creative work' }, attribute: 'creativity', difficulty: 'normal', recurrence: 'daily' },
    { title: { de: 'Eine Idee skizzieren', en: 'Sketch out one idea' }, attribute: 'creativity', difficulty: 'easy', recurrence: 'once' },
  ],
  social: [
    { title: { de: 'Jemandem schreiben, an den du denkst', en: "Message someone you're thinking of" }, attribute: 'social', difficulty: 'easy', recurrence: 'once' },
    { title: { de: 'Ein echtes Gespräch ohne Handy', en: 'A real conversation, phone away' }, attribute: 'social', difficulty: 'normal', recurrence: 'daily' },
  ],
};

export const HABIT_TEMPLATES: Record<Attribute, HabitTemplate> = {
  discipline: { name: { de: 'Früh aufstehen', en: 'Wake up early' }, icon: 'Sunrise', attribute: 'discipline', weeklyTarget: 5, color: 'amber' },
  intelligence: { name: { de: 'Lesen', en: 'Reading' }, icon: 'BookOpen', attribute: 'intelligence', weeklyTarget: 7, color: 'violet' },
  fitness: { name: { de: 'Bewegung', en: 'Movement' }, icon: 'Dumbbell', attribute: 'fitness', weeklyTarget: 4, color: 'emerald' },
  finance: { name: { de: 'Ausgaben prüfen', en: 'Review spending' }, icon: 'Wallet', attribute: 'finance', weeklyTarget: 3, color: 'sky' },
  creativity: { name: { de: 'Journaling', en: 'Journaling' }, icon: 'PenLine', attribute: 'creativity', weeklyTarget: 7, color: 'rose' },
  social: { name: { de: 'Kontakt pflegen', en: 'Reach out' }, icon: 'Users', attribute: 'social', weeklyTarget: 3, color: 'cyan' },
};

export function missionFromTemplate(t: MissionTemplate, lang: Lang, source: Mission['source'] = 'starter'): Mission {
  return {
    id: uid('m'),
    title: t.title[lang],
    attribute: t.attribute,
    difficulty: t.difficulty,
    recurrence: t.recurrence,
    date: t.recurrence === 'once' ? todayKey() : undefined,
    target: t.target ?? 1,
    progress: {},
    completed: {},
    createdAt: new Date().toISOString(),
    source,
  };
}

export function habitFromTemplate(t: HabitTemplate, lang: Lang): Habit {
  return { id: uid('h'), name: t.name[lang], icon: t.icon, attribute: t.attribute, weeklyTarget: t.weeklyTarget, color: t.color, log: {}, createdAt: new Date().toISOString() };
}

/** Personalised starter missions: scaled to available daily time, drawn from chosen focus areas. */
export function starterMissions(profile: Profile, lang: Lang): Mission[] {
  const count = profile.dailyMinutes <= 15 ? 3 : profile.dailyMinutes <= 30 ? 4 : profile.dailyMinutes <= 60 ? 5 : 6;
  const areas: Attribute[] = profile.focusAreas.length ? profile.focusAreas : ['discipline', 'intelligence', 'fitness'];
  const picked: MissionTemplate[] = [];
  let round = 0;
  while (picked.length < count && round < 2) {
    for (const a of areas) {
      const t = MISSION_TEMPLATES[a][round];
      if (t && picked.length < count) picked.push(t);
    }
    round++;
  }
  // Short on time? Prefer lighter missions.
  if (profile.dailyMinutes <= 15) picked.sort((a, b) => diffRank(a.difficulty) - diffRank(b.difficulty));
  return picked.map((t) => missionFromTemplate(t, lang));
}
const diffRank = (d: Difficulty) => ['easy', 'normal', 'challenging', 'hard', 'epic'].indexOf(d);

export function starterHabits(profile: Profile, lang: Lang): Habit[] {
  const areas = profile.focusAreas.length ? profile.focusAreas : (['intelligence', 'fitness'] as Attribute[]);
  return areas.slice(0, 3).map((a) => habitFromTemplate(HABIT_TEMPLATES[a], lang));
}

export const EXPENSE_CATEGORIES = ['housing', 'food', 'transport', 'leisure', 'shopping', 'health', 'subscriptions', 'education', 'other'] as const;
export const INCOME_CATEGORIES = ['salary', 'side', 'gift', 'refund', 'other_income'] as const;

export function defaultSettings(lang: Lang = 'de'): Settings {
  return {
    lang,
    theme: 'dark',
    accent: 'violet',
    motion: 'system',
    largeText: false,
    highContrast: false,
    baseCurrency: 'EUR',
    hideAmounts: false,
    notifications: { enabled: false, habitReminders: true, dailyPlan: false, dailyPlanTime: '08:00' },
    ai: { endpoint: '/api/companion' },
    privacy: { localOnly: true, shareActivityWithFriends: false },
  };
}

export function emptyData(lang: Lang = 'de'): VybeData {
  return {
    version: 1,
    onboarded: false,
    profile: null,
    missions: [],
    habits: [],
    transactions: [],
    budgets: [],
    savings: [],
    ledger: [],
    achievements: [],
    chat: [],
    friends: [],
    challenges: [],
    groups: [],
    streakFreezes: 0,
    frozenDays: [],
    settings: defaultSettings(lang),
  };
}

/** Demo challenges — simulated participants are explicitly flagged as demo. */
export function demoChallenges(lang: Lang): VybeData['challenges'] {
  const today = todayKey();
  const de = lang === 'de';
  return [
    {
      id: uid('c'),
      title: de ? '7 Tage Lesen' : '7 Days of Reading',
      description: de ? 'Erledige an 5 von 7 Tagen eine Intelligenz-Mission oder -Gewohnheit.' : 'Complete an intelligence mission or habit on 5 of 7 days.',
      attribute: 'intelligence', goalDays: 5, startDate: today, endDate: addDays(today, 6), joined: false, kind: 'demo',
      participants: [ { name: 'Mira', progress: 2, demo: true }, { name: 'Jonas', progress: 1, demo: true }, { name: 'Lea', progress: 3, demo: true } ],
    },
    {
      id: uid('c'),
      title: de ? 'Bewegungs-Sprint' : 'Movement Sprint',
      description: de ? 'Sammle an 10 von 14 Tagen Fitness-XP.' : 'Earn fitness XP on 10 of 14 days.',
      attribute: 'fitness', goalDays: 10, startDate: today, endDate: addDays(today, 13), joined: false, kind: 'demo',
      participants: [ { name: 'Kai', progress: 4, demo: true }, { name: 'Sam', progress: 2, demo: true } ],
    },
    {
      id: uid('c'),
      title: de ? 'Spar-Woche' : 'Savings Week',
      description: de ? 'Sammle an 4 von 7 Tagen Finanz-XP.' : 'Earn finance XP on 4 of 7 days.',
      attribute: 'finance', goalDays: 4, startDate: today, endDate: addDays(today, 6), joined: false, kind: 'demo',
      participants: [ { name: 'Noah', progress: 1, demo: true }, { name: 'Ella', progress: 2, demo: true } ],
    },
  ];
}
