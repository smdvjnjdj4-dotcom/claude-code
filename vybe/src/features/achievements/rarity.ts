import type { Rarity } from '@/domain/achievements';

export const RARITY_STYLE: Record<Rarity, { badge: string; text: string; ring: string }> = {
  common: { badge: 'border-slate-400/30 bg-gradient-to-br from-slate-400/20 to-slate-500/5 text-slate-300', text: 'bg-slate-400/15 text-slate-300', ring: '148 163 184' },
  rare: { badge: 'border-sky-400/40 bg-gradient-to-br from-sky-400/25 to-cyan-500/5 text-sky-300 shadow-[0_0_24px_-6px_rgb(56_189_248/0.6)]', text: 'bg-sky-400/15 text-sky-300', ring: '56 189 248' },
  epic: { badge: 'border-violet-400/50 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10 text-violet-300 shadow-[0_0_28px_-6px_rgb(167_139_250/0.7)]', text: 'bg-violet-400/15 text-violet-300', ring: '167 139 250' },
  legendary: { badge: 'border-amber-300/60 bg-gradient-to-br from-amber-400/30 via-orange-500/15 to-rose-500/10 text-amber-200 shadow-[0_0_36px_-6px_rgb(251_191_36/0.8)]', text: 'bg-amber-400/15 text-amber-300', ring: '251 191 36' },
};
