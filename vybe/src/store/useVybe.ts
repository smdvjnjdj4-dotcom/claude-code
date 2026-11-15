import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Budget, ChatMessage, Habit, Mission, Profile, SavingsGoal, Settings, Transaction, VybeData, XpEvent } from '@/domain/types';
import { emptyData, starterHabits, starterMissions, demoChallenges } from '@/domain/content';
import { buildDemoData } from '@/domain/demo';
import * as engine from '@/domain/engine';
import type { ActionResult } from '@/domain/engine';
import type { AchievementDef } from '@/domain/achievements';
import { idbStorage } from '@/lib/storage';
import { validateImport } from './importExport';

export interface RewardToast {
  id: string;
  xp: number;
  label: string;
}

interface Ephemeral {
  hydrated: boolean;
  /** Keeps the onboarding finish screen visible right after profile creation. */
  justOnboarded: boolean;
  /** Achievement unlocks waiting for the reveal animation */
  unlockQueue: AchievementDef[];
  rewards: RewardToast[];
  levelUp: number | null;
  toasts: { id: string; text: string; tone: 'ok' | 'err' | 'info' }[];
}

interface Actions {
  completeOnboarding: (p: Omit<Profile, 'createdAt' | 'isDemo'>) => void;
  startDemo: () => void;
  resetAll: () => void;
  updateProfile: (p: Partial<Profile>) => void;
  updateSettings: (s: Partial<Settings>) => void;

  saveMission: (m: Mission) => void;
  deleteMission: (id: string) => void;
  toggleMission: (id: string) => void;
  stepMission: (id: string, delta: 1 | -1) => void;

  saveHabit: (h: Habit) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, day?: string) => void;

  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (b: Budget) => void;
  removeBudget: (category: string) => void;
  saveGoal: (g: SavingsGoal) => void;
  deleteGoal: (id: string) => void;
  contribute: (goalId: string, amount: number) => void;

  pushChat: (m: ChatMessage) => void;
  updateChat: (id: string, patch: Partial<ChatMessage>) => void;
  clearChat: () => void;

  setData: (fn: (d: VybeData) => VybeData) => void;
  setCommunityDocs: (fn: (docs: Record<string, unknown>) => Record<string, unknown>) => void;
  /** Idempotent social XP (e.g. first post of the day, a new connection). */
  communityReward: (key: string, xp: number, label: string) => void;
  importJson: (json: string) => { ok: true } | { ok: false; error: string };

  shiftUnlock: () => void;
  dismissReward: (id: string) => void;
  clearLevelUp: () => void;
  toast: (text: string, tone?: 'ok' | 'err' | 'info') => void;
  dismissToast: (id: string) => void;
  refreshDay: () => void;
}

export type VybeState = VybeData & Ephemeral & Actions;

const DATA_KEYS: (keyof VybeData)[] = ['version', 'onboarded', 'profile', 'missions', 'habits', 'transactions', 'budgets', 'savings', 'ledger', 'achievements', 'chat', 'friends', 'challenges', 'groups', 'streakFreezes', 'lastFreezeAward', 'frozenDays', 'settings', 'communityDocs'];

export function pickData(s: VybeState | VybeData): VybeData {
  const out: Record<string, unknown> = {};
  for (const k of DATA_KEYS) out[k] = (s as unknown as Record<string, unknown>)[k];
  return out as unknown as VybeData;
}

let n = 0;
const tid = () => `${Date.now()}_${n++}`;

export const useVybe = create<VybeState>()(
  persist(
    (set, get) => {
      /** Apply an engine result: persist data, queue rewards & unlock reveals. */
      const apply = (r: ActionResult) => {
        const before = levelOf(get());
        set(r.data);
        const after = levelOf(get());
        if (r.gained.length) {
          const rewards = r.gained.filter((e: XpEvent) => !e.key.startsWith('ach:')).map((e) => ({ id: tid(), xp: e.xp, label: e.label }));
          set((s) => ({ rewards: [...s.rewards, ...rewards].slice(-4) }));
        }
        if (r.unlocked.length) set((s) => ({ unlockQueue: [...s.unlockQueue, ...r.unlocked] }));
        if (after > before) set({ levelUp: after });
      };
      const mutate = (fn: (d: VybeData) => VybeData) => set(fn(pickData(get())));

      return {
        ...emptyData('de'),
        hydrated: false,
        justOnboarded: false,
        unlockQueue: [],
        rewards: [],
        levelUp: null,
        toasts: [],

        completeOnboarding: (p) => {
          const lang = get().settings.lang;
          const profile: Profile = { ...p, createdAt: new Date().toISOString(), isDemo: false };
          const base = { ...emptyData(lang), settings: get().settings };
          const data: VybeData = { ...base, onboarded: true, profile, missions: starterMissions(profile, lang), habits: starterHabits(profile, lang), challenges: demoChallenges(lang) };
          set({ justOnboarded: true });
          apply(engine.finalize(data));
        },
        startDemo: () => {
          const lang = get().settings.lang;
          set({ ...buildDemoData(lang), settings: { ...get().settings } , unlockQueue: [], rewards: [], levelUp: null });
        },
        resetAll: () => set({ ...emptyData(get().settings.lang), settings: get().settings, unlockQueue: [], rewards: [], levelUp: null }),
        updateProfile: (p) => set((s) => ({ profile: s.profile ? { ...s.profile, ...p } : s.profile })),
        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        saveMission: (m) => mutate((d) => engine.upsertMission(d, m)),
        deleteMission: (id) => mutate((d) => engine.deleteMission(d, id)),
        toggleMission: (id) => {
          const d = pickData(get());
          const m = d.missions.find((x) => x.id === id);
          if (!m) return;
          apply(engine.isMissionDone(m, todayKeyLocal()) ? engine.uncompleteMission(d, id) : engine.completeMission(d, id));
        },
        stepMission: (id, delta) => apply(engine.stepMission(pickData(get()), id, delta)),

        saveHabit: (h) => mutate((d) => ({ ...d, habits: d.habits.some((x) => x.id === h.id) ? d.habits.map((x) => (x.id === h.id ? h : x)) : [...d.habits, h] })),
        deleteHabit: (id) => mutate((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) })),
        toggleHabit: (id, day) => apply(engine.toggleHabit(pickData(get()), id, day)),

        addTransaction: (t) => apply(engine.addTransaction(pickData(get()), t)),
        deleteTransaction: (id) => mutate((d) => engine.deleteTransaction(d, id)),
        setBudget: (b) => {
          const d = pickData(get());
          const budgets = d.budgets.some((x) => x.category === b.category) ? d.budgets.map((x) => (x.category === b.category ? b : x)) : [...d.budgets, b];
          apply(engine.finalize({ ...d, budgets }));
        },
        removeBudget: (category) => mutate((d) => ({ ...d, budgets: d.budgets.filter((b) => b.category !== category) })),
        saveGoal: (g) => mutate((d) => ({ ...d, savings: d.savings.some((x) => x.id === g.id) ? d.savings.map((x) => (x.id === g.id ? g : x)) : [...d.savings, g] })),
        deleteGoal: (id) => mutate((d) => ({ ...d, savings: d.savings.filter((g) => g.id !== id) })),
        contribute: (goalId, amount) => apply(engine.contributeToGoal(pickData(get()), goalId, amount)),

        pushChat: (m) => {
          const d = pickData(get());
          apply(engine.finalize({ ...d, chat: [...d.chat, m].slice(-200) }));
        },
        updateChat: (id, patch) => set((s) => ({ chat: s.chat.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        clearChat: () => set({ chat: [] }),

        setData: (fn) => apply(engine.finalize(fn(pickData(get())))),
        setCommunityDocs: (fn) => set((s) => ({ communityDocs: fn(s.communityDocs ?? {}) })),
        communityReward: (key, xp, label) => {
          if (get().ledger.some((e) => e.key === key)) return;
          const r = award(pickData(get()), { key, xp, label, attribute: 'social' });
          apply(engine.finalize(r.data, r.event ? [r.event] : []));
        },
        importJson: (json) => {
          const res = validateImport(json);
          if (!res.ok) return res;
          set({ ...res.data, unlockQueue: [], rewards: [], levelUp: null });
          return { ok: true };
        },

        shiftUnlock: () => set((s) => ({ unlockQueue: s.unlockQueue.slice(1) })),
        dismissReward: (id) => set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) })),
        clearLevelUp: () => set({ levelUp: null }),
        toast: (text, tone = 'ok') => {
          const id = tid();
          set((s) => ({ toasts: [...s.toasts, { id, text, tone }].slice(-3) }));
          setTimeout(() => get().dismissToast(id), 3200);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        refreshDay: () => apply(engine.finalize(pickData(get()))),
      };
    },
    {
      name: 'vybe-state',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => pickData(s),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<VybeData>;
        const base = { ...current, ...p } as VybeState;
        // German is the default language; users switch in onboarding or settings.
        base.settings = { ...emptyData('de').settings, ...(p.settings ?? {}) };
        // Migrate the single local community profile of earlier versions.
        const legacy = (p as { community?: unknown }).community;
        base.communityDocs = { ...(p.communityDocs ?? {}) };
        if (legacy && typeof legacy === 'object' && !base.communityDocs['members/local-me']) base.communityDocs['members/local-me'] = legacy;
        delete (base as { community?: unknown }).community;
        return base;
      },
      onRehydrateStorage: () => (state) => {
        // Runs after hydration: mark ready and reconcile streak freezes for the new day.
        setTimeout(() => {
          useVybe.setState({ hydrated: true });
          if (state?.onboarded) useVybe.getState().refreshDay();
        }, 0);
      },
    },
  ),
);

import { award, levelFromXp, totalXp } from '@/domain/progression';
import { todayKey as todayKeyLocal } from '@/lib/date';
function levelOf(s: VybeData) {
  return levelFromXp(totalXp(s.ledger)).level;
}
