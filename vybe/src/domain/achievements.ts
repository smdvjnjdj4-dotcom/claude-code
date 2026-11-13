import type { Attribute, VybeData } from './types';
import { ATTRIBUTES } from './types';
import { attrLevelFromXp, attributeXp, bestStreak, levelFromXp, totalXp } from './progression';
import { bestHabitStreakDays } from './habits';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITY_BONUS: Record<Rarity, number> = { common: 10, rare: 25, epic: 50, legendary: 100 };

export interface AchievementDef {
  id: string;
  rarity: Rarity;
  icon: string; // lucide icon name
  title: { de: string; en: string };
  desc: { de: string; en: string };
  progress: (d: VybeData) => { current: number; target: number };
}

const completedMissionCount = (d: VybeData) => d.missions.reduce((s, m) => s + Object.keys(m.completed).length, 0);
const maxHabitStreak = (d: VybeData) => d.habits.reduce((m, h) => Math.max(m, bestHabitStreakDays(h)), 0);
const habitLogs = (d: VybeData) => d.habits.reduce((s, h) => s + Object.keys(h.log).length, 0);
const level = (d: VybeData) => levelFromXp(totalXp(d.ledger.filter((e) => !e.key.startsWith('ach:')))).level;
const maxAttrLevel = (d: VybeData) => {
  const ax = attributeXp(d.ledger);
  return Math.max(...ATTRIBUTES.map((a: Attribute) => attrLevelFromXp(ax[a]).level));
};
const touchedAttributes = (d: VybeData) => {
  const ax = attributeXp(d.ledger);
  return ATTRIBUTES.filter((a) => ax[a] > 0).length;
};
const completedGoals = (d: VybeData) => d.savings.filter((g) => g.saved >= g.target).length;
const p = (current: number, target: number) => ({ current: Math.min(current, target), target });

export const ACHIEVEMENTS: AchievementDef[] = [
  // Common
  { id: 'first_step', rarity: 'common', icon: 'Footprints', title: { de: 'Erster Schritt', en: 'First Step' }, desc: { de: 'Schließe deine erste Mission ab.', en: 'Complete your first mission.' }, progress: (d) => p(completedMissionCount(d), 1) },
  { id: 'habit_seed', rarity: 'common', icon: 'Sprout', title: { de: 'Saatkorn', en: 'Seedling' }, desc: { de: 'Hake zum ersten Mal eine Gewohnheit ab.', en: 'Log a habit for the first time.' }, progress: (d) => p(habitLogs(d), 1) },
  { id: 'money_aware', rarity: 'common', icon: 'Wallet', title: { de: 'Geldbewusst', en: 'Money Aware' }, desc: { de: 'Erfasse deine erste Buchung.', en: 'Log your first transaction.' }, progress: (d) => p(d.transactions.filter((t) => t.source !== 'demo').length, 1) },
  { id: 'first_talk', rarity: 'common', icon: 'MessageCircle', title: { de: 'Hallo, Companion', en: 'Hello, Companion' }, desc: { de: 'Stelle deinem Companion eine Frage.', en: 'Ask your companion something.' }, progress: (d) => p(d.chat.filter((c) => c.role === 'user').length, 1) },
  { id: 'streak_3', rarity: 'common', icon: 'Flame', title: { de: 'Warmgelaufen', en: 'Warmed Up' }, desc: { de: 'Erreiche eine 3-Tage-Serie.', en: 'Reach a 3-day streak.' }, progress: (d) => p(bestStreak(d), 3) },
  // Rare
  { id: 'missions_25', rarity: 'rare', icon: 'Target', title: { de: 'Missionsprofi', en: 'Mission Pro' }, desc: { de: 'Schließe 25 Missionen ab.', en: 'Complete 25 missions.' }, progress: (d) => p(completedMissionCount(d), 25) },
  { id: 'streak_7', rarity: 'rare', icon: 'Flame', title: { de: 'Eine Woche Fokus', en: 'A Week of Focus' }, desc: { de: 'Erreiche eine 7-Tage-Serie.', en: 'Reach a 7-day streak.' }, progress: (d) => p(bestStreak(d), 7) },
  { id: 'habit_7', rarity: 'rare', icon: 'Repeat', title: { de: 'Rhythmus', en: 'Rhythm' }, desc: { de: 'Halte eine Gewohnheit 7 Tage in Folge.', en: 'Keep a habit 7 days in a row.' }, progress: (d) => p(maxHabitStreak(d), 7) },
  { id: 'level_5', rarity: 'rare', icon: 'Sparkles', title: { de: 'Aufsteiger', en: 'Rising' }, desc: { de: 'Erreiche Level 5.', en: 'Reach level 5.' }, progress: (d) => p(level(d), 5) },
  { id: 'well_rounded', rarity: 'rare', icon: 'Hexagon', title: { de: 'Vielseitig', en: 'Well-Rounded' }, desc: { de: 'Sammle XP in allen sechs Attributen.', en: 'Earn XP in all six attributes.' }, progress: (d) => p(touchedAttributes(d), 6) },
  { id: 'budgeteer', rarity: 'rare', icon: 'PieChart', title: { de: 'Budget-Stratege', en: 'Budgeteer' }, desc: { de: 'Lege 3 Monatsbudgets fest.', en: 'Set 3 monthly budgets.' }, progress: (d) => p(d.budgets.length, 3) },
  // Epic
  { id: 'missions_100', rarity: 'epic', icon: 'Swords', title: { de: 'Hundert Siege', en: 'Hundred Wins' }, desc: { de: 'Schließe 100 Missionen ab.', en: 'Complete 100 missions.' }, progress: (d) => p(completedMissionCount(d), 100) },
  { id: 'streak_30', rarity: 'epic', icon: 'CalendarCheck', title: { de: 'Monat der Konstanz', en: 'Month of Consistency' }, desc: { de: 'Erreiche eine 30-Tage-Serie.', en: 'Reach a 30-day streak.' }, progress: (d) => p(bestStreak(d), 30) },
  { id: 'level_10', rarity: 'epic', icon: 'Crown', title: { de: 'Zweistellig', en: 'Double Digits' }, desc: { de: 'Erreiche Level 10.', en: 'Reach level 10.' }, progress: (d) => p(level(d), 10) },
  { id: 'attr_master', rarity: 'epic', icon: 'Gem', title: { de: 'Spezialist', en: 'Specialist' }, desc: { de: 'Bringe ein Attribut auf Stufe 8.', en: 'Bring one attribute to rank 8.' }, progress: (d) => p(maxAttrLevel(d), 8) },
  { id: 'goal_reached', rarity: 'epic', icon: 'PiggyBank', title: { de: 'Sparziel erreicht', en: 'Goal Reached' }, desc: { de: 'Erreiche ein Sparziel vollständig.', en: 'Fully reach a savings goal.' }, progress: (d) => p(completedGoals(d), 1) },
  // Legendary
  { id: 'habit_66', rarity: 'legendary', icon: 'Infinity', title: { de: 'Zweite Natur', en: 'Second Nature' }, desc: { de: 'Halte eine Gewohnheit 66 Tage in Folge.', en: 'Keep a habit for 66 days in a row.' }, progress: (d) => p(maxHabitStreak(d), 66) },
  { id: 'streak_100', rarity: 'legendary', icon: 'Orbit', title: { de: 'Umlaufbahn', en: 'Orbit' }, desc: { de: 'Erreiche eine 100-Tage-Serie.', en: 'Reach a 100-day streak.' }, progress: (d) => p(bestStreak(d), 100) },
  { id: 'level_20', rarity: 'legendary', icon: 'Star', title: { de: 'Supernova', en: 'Supernova' }, desc: { de: 'Erreiche Level 20.', en: 'Reach level 20.' }, progress: (d) => p(level(d), 20) },
];

/** Returns ids of achievements that are fulfilled but not yet recorded. */
export function newlyUnlocked(d: VybeData): AchievementDef[] {
  const have = new Set(d.achievements.map((a) => a.id));
  return ACHIEVEMENTS.filter((a) => {
    if (have.has(a.id)) return false;
    const { current, target } = a.progress(d);
    return current >= target;
  });
}
