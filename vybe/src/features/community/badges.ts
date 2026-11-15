import { useMemo } from 'react';
import { useCommunity, seatOf } from '@/community/CommunityContext';
import { relation } from '@/community/model';
import { useVybe } from '@/store/useVybe';
import type { Tab } from './nav';

/** Attention counts: unread chats, games waiting for you, connection requests. */
const NO_READ: Record<string, string> = {};

export function useBadges(): Partial<Record<Tab, number>> {
  const c = useCommunity();
  const read = useVybe((s) => s.communityDocs['private/read'] as Record<string, string> | undefined) ?? NO_READ;
  return useMemo(() => {
    const me = c.me;
    if (!me) return {};
    let unread = 0;
    for (const [from, ob] of Object.entries(c.outboxes)) {
      if (from === me.id) continue;
      const last = ob.threads[me.id]?.msgs[ob.threads[me.id].msgs.length - 1];
      if (last && (!read[from] || read[from] < last.at)) unread++;
    }
    const games = c.games.filter((g) => {
      const seat = seatOf(g, me.id);
      if (!seat) return false;
      if (g.status === 'invited') return seat === 'guest';
      if (g.status !== 'active') return false;
      return g.type === 'rps' ? g.rps.needs[seat] === 'choose' : g.turn === seat;
    }).length;
    const people = c.members.filter((m) => relation(me, m) === 'incoming').length;
    return { chats: unread, games, people };
  }, [c.me, c.outboxes, c.games, c.members, read]);
}
