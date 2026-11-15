import { LIMITS } from './types';
import { addDays, todayKey, toKey } from '@/lib/date';

/** One stored message. Live: `iv` + `ct` (AES-GCM ciphertext). Local/demo: plain `text`. */
export interface StoredMessage { id: string; at: string; iv?: string; ct?: string; text?: string }
export interface Thread { msgs: StoredMessage[]; /** local days on which I wrote in this thread (for streaks) */ days: string[] }
/** Everything one member has sent, one document per sender: threads keyed by recipient id. */
export interface OutboxDoc { v: 1; threads: Record<string, Thread> }

const B64 = /^[A-Za-z0-9+/=_-]{1,4000}$/;

export function emptyOutbox(): OutboxDoc { return { v: 1, threads: {} }; }

export function parseOutbox(raw: unknown): OutboxDoc {
  const out = emptyOutbox();
  const t = (raw as { threads?: unknown } | null)?.threads;
  if (!t || typeof t !== 'object') return out;
  for (const [to, th] of Object.entries(t as Record<string, unknown>).slice(0, 200)) {
    if (to.length > 200 || !th || typeof th !== 'object') continue;
    const x = th as Record<string, unknown>;
    const msgs = (Array.isArray(x.msgs) ? x.msgs : []).flatMap((m): StoredMessage[] => {
      const r = m as Record<string, unknown>;
      if (!r || typeof r.id !== 'string' || typeof r.at !== 'string' || Number.isNaN(Date.parse(r.at))) return [];
      if (typeof r.iv === 'string' && typeof r.ct === 'string' && B64.test(r.iv) && B64.test(r.ct)) return [{ id: r.id.slice(0, 64), at: r.at, iv: r.iv, ct: r.ct }];
      if (typeof r.text === 'string' && r.text.trim()) return [{ id: r.id.slice(0, 64), at: r.at, text: r.text.slice(0, LIMITS.message) }];
      return [];
    }).slice(-LIMITS.messagesPerThread);
    const days = (Array.isArray(x.days) ? x.days : []).filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-400);
    out.threads[to] = { msgs, days };
  }
  return out;
}

export function appendMessage(doc: OutboxDoc, to: string, msg: StoredMessage, now = new Date()): OutboxDoc {
  const th = doc.threads[to] ?? { msgs: [], days: [] };
  const day = toKey(now);
  return {
    ...doc,
    threads: {
      ...doc.threads,
      [to]: { msgs: [...th.msgs, msg].slice(-LIMITS.messagesPerThread), days: th.days.includes(day) ? th.days : [...th.days, day].slice(-400) },
    },
  };
}

/**
 * Chat streak: consecutive days on which BOTH people wrote. It stays alive through today
 * (you have the whole day to answer) and breaks after a full day without a mutual exchange.
 */
export function chatStreak(myDays: string[], theirDays: string[], today: string = todayKey()): number {
  const mine = new Set(myDays);
  const mutual = (d: string) => mine.has(d) && theirDays.includes(d);
  let day = mutual(today) ? today : addDays(today, -1);
  let n = 0;
  while (mutual(day)) { n++; day = addDays(day, -1); }
  return n;
}

export const ACCESSORIES = [
  { min: 100, id: 'supernova', icon: 'Orbit', de: 'Supernova', en: 'Supernova' },
  { min: 30, id: 'comet', icon: 'Star', de: 'Komet', en: 'Comet' },
  { min: 7, id: 'flame', icon: 'Flame', de: 'Flamme', en: 'Flame' },
  { min: 3, id: 'spark', icon: 'Sparkles', de: 'Funke', en: 'Spark' },
] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export function accessoryFor(streak: number): Accessory | null {
  return ACCESSORIES.find((a) => streak >= a.min) ?? null;
}
export function nextAccessory(streak: number): Accessory | null {
  return [...ACCESSORIES].reverse().find((a) => streak < a.min) ?? null;
}
