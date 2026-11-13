import type { Attribute, Difficulty, Lang } from '@/domain/types';

/** Compact, privacy-conscious context the companion may use. No financial amounts are sent. */
export interface CompanionContext {
  lang: Lang;
  name: string;
  goals: string[];
  focusAreas: Attribute[];
  dailyMinutes: number;
  motivations: string[];
  level: number;
  streak: number;
  todayOpenMissions: string[];
  todayDoneMissions: string[];
  habits: { name: string; doneToday: boolean; streak: number }[];
  weekXp: number;
  lastWeekXp: number;
  weakestAttribute: Attribute;
  strongestAttribute: Attribute;
}

export interface ProposalDraft {
  title: string;
  attribute: Attribute;
  difficulty: Difficulty;
  recurrence: 'once' | 'daily';
}

export interface CompanionReply {
  text: string;
  proposals: ProposalDraft[];
  mode: 'demo' | 'live';
}

export interface CompanionProvider {
  readonly mode: 'demo' | 'live';
  reply(history: { role: 'user' | 'assistant'; text: string }[], ctx: CompanionContext): Promise<CompanionReply>;
}
