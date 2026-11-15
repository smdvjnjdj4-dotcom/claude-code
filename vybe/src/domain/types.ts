// Core, type-safe data models for VYBE. All persisted state lives in `VybeData`.

export const ATTRIBUTES = ['discipline', 'intelligence', 'fitness', 'finance', 'creativity', 'social'] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const DIFFICULTIES = ['easy', 'normal', 'challenging', 'hard', 'epic'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type Lang = 'de' | 'en';
export type ThemeMode = 'dark' | 'light' | 'system';
export type AccentTheme = 'violet' | 'cyan' | 'aurora' | 'solar' | 'nebula';
export type MotionPref = 'system' | 'reduced' | 'full';

/** ISO date key in local time: YYYY-MM-DD */
export type DateKey = string;

export interface Profile {
  name: string;
  goals: string[];
  focusAreas: Attribute[];
  dailyMinutes: number;
  motivations: string[];
  createdAt: string;
  isDemo: boolean;
}

export interface Mission {
  id: string;
  title: string;
  note?: string;
  attribute: Attribute;
  difficulty: Difficulty;
  recurrence: 'once' | 'daily';
  /** For one-off missions: the day it belongs to. */
  date?: DateKey;
  /** Optional numeric target (e.g. 3 sets). 1 means a simple checkbox. */
  target: number;
  /** Progress per day (recurring) or under key 'once'. */
  progress: Record<string, number>;
  /** Days on which the mission was completed (key 'once' for one-off). */
  completed: Record<string, true>;
  /** Day a one-off mission was completed. */
  doneOn?: DateKey;
  createdAt: string;
  archived?: boolean;
  source?: 'user' | 'starter' | 'ai' | 'demo';
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  attribute: Attribute;
  /** times per week the user aims for (7 = daily) */
  weeklyTarget: number;
  reminder?: string; // HH:MM
  color: 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'sky';
  log: Record<DateKey, true>;
  createdAt: string;
  archived?: boolean;
}

export type TxType = 'income' | 'expense';
export interface Transaction {
  id: string;
  type: TxType;
  /** Amount in minor units (cents). Always positive. */
  amount: number;
  currency: string;
  category: string;
  note?: string;
  date: DateKey;
  /** 'manual' for user-entered data. 'connected' reserved for future bank sync. */
  source: 'manual' | 'connected' | 'demo';
}

export interface Budget {
  category: string;
  /** monthly limit in minor units of the base currency */
  limit: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number; // minor units
  saved: number; // minor units
  currency: string;
  deadline?: DateKey;
  createdAt: string;
}

/** Ledger entry: every XP change is recorded exactly once per `key`. */
export interface XpEvent {
  key: string; // idempotency key, e.g. mission:<id>:<date>
  at: string; // ISO timestamp
  date: DateKey;
  xp: number;
  attribute?: Attribute;
  attributeXp?: number;
  label: string;
}

export interface UnlockedAchievement {
  id: string;
  at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  mode?: 'demo' | 'live';
  proposals?: MissionProposal[];
}

export interface MissionProposal {
  id: string;
  title: string;
  attribute: Attribute;
  difficulty: Difficulty;
  recurrence: 'once' | 'daily';
  status: 'pending' | 'accepted' | 'dismissed';
}

export interface Friend {
  id: string;
  name: string;
  addedAt: string;
  /** Local-only contact (no online account yet). */
  kind: 'local' | 'demo';
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  attribute: Attribute;
  /** Metric: number of days a matching habit/mission was completed within the window. */
  goalDays: number;
  startDate: DateKey;
  endDate: DateKey;
  joined: boolean;
  /** Simulated participants are labelled demo and never presented as real people. */
  participants: { name: string; progress: number; demo: boolean }[];
  kind: 'demo' | 'local';
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

export interface Settings {
  lang: Lang;
  theme: ThemeMode;
  accent: AccentTheme;
  motion: MotionPref;
  largeText: boolean;
  highContrast: boolean;
  baseCurrency: string;
  hideAmounts: boolean;
  notifications: { enabled: boolean; habitReminders: boolean; dailyPlan: boolean; dailyPlanTime: string };
  ai: { endpoint: string }; // relative URL of a backend proxy. Never an API key.
  privacy: { localOnly: true; shareActivityWithFriends: boolean };
}

import type { MemberDoc } from '@/community/types';

export interface VybeData {
  version: 1;
  onboarded: boolean;
  profile: Profile | null;
  missions: Mission[];
  habits: Habit[];
  transactions: Transaction[];
  budgets: Budget[];
  savings: SavingsGoal[];
  ledger: XpEvent[];
  achievements: UnlockedAchievement[];
  chat: ChatMessage[];
  friends: Friend[];
  challenges: Challenge[];
  groups: Group[];
  /** Streak freezes available (earned every 7 active days, max 2). */
  streakFreezes: number;
  /** Last day a freeze was earned (prevents double awards). */
  lastFreezeAward?: DateKey;
  /** Days that were covered by a freeze. */
  frozenDays: DateKey[];
  settings: Settings;
  /** Own community profile in the standalone app (the shared link keeps it in its shared database). */
  community: MemberDoc | null;
}
