import type { CompanionContext, CompanionProvider, CompanionReply, ProposalDraft } from './types';
import { ATTRIBUTES, DIFFICULTIES } from '@/domain/types';

/**
 * Live companion: calls YOUR backend proxy (e.g. server/ai-proxy.mjs), which holds the API key.
 * The frontend never sees or stores a key.
 */
export function httpProvider(endpoint: string): CompanionProvider {
  return {
    mode: 'live',
    async reply(history, ctx: CompanionContext): Promise<CompanionReply> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60_000);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history.slice(-12), context: ctx }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { text?: unknown; proposals?: unknown };
        if (typeof json.text !== 'string') throw new Error('bad response');
        return { text: json.text, proposals: sanitize(json.proposals), mode: 'live' };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Never trust model output: keep only well-formed proposals. */
export function sanitize(raw: unknown): ProposalDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => ({
      title: String(p.title ?? '').trim().slice(0, 80),
      attribute: (ATTRIBUTES as readonly string[]).includes(p.attribute as string) ? (p.attribute as ProposalDraft['attribute']) : 'discipline',
      difficulty: (DIFFICULTIES as readonly string[]).includes(p.difficulty as string) ? (p.difficulty as ProposalDraft['difficulty']) : 'normal',
      recurrence: p.recurrence === 'daily' ? ('daily' as const) : ('once' as const),
    }))
    .filter((p) => p.title.length >= 2)
    .slice(0, 5);
}

/** Lightweight availability probe (GET returns {ok:true} on the reference proxy). */
export async function probe(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const j = await res.json().catch(() => null);
    return !!j && j.ok === true;
  } catch {
    return false;
  }
}
