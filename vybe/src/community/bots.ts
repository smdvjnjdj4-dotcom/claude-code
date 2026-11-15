import { useVybe } from '@/store/useVybe';
import { writeLocalAs } from './local';
import { appendMessage, emptyOutbox, type OutboxDoc } from './messages';
import { botMove, commitFor, type GameHalf, type GameView, type GamesDoc } from './games';
import type { Member } from './types';
import type { Lang } from '@/domain/types';

const REPLIES: Record<Lang, string[]> = {
  de: [
    'Hey! Schön, von dir zu hören. Woran arbeitest du gerade?',
    'Klingt gut – lass uns morgen wieder schreiben, dann wächst unsere Serie.',
    'Ich hab heute schon meine Mission geschafft. Und du?',
    'Haha, ja! Lust auf eine Runde Vier gewinnt?',
    'Danke dir! Motivation geteilt ist doppelte Motivation.',
  ],
  en: [
    "Hey! Nice to hear from you. What are you working on?",
    "Sounds good — let's text again tomorrow so our streak grows.",
    'I already finished my mission today. You?',
    'Haha, yes! Up for a round of Connect Four?',
    'Thank you! Shared motivation is double motivation.',
  ],
};

interface BotInput { meId: string; members: Member[]; outboxes: Record<string, OutboxDoc>; gameDocs: { id: string; doc: GamesDoc }[]; games: GameView[]; lang: Lang }

/**
 * Demo members in the standalone app. They are labelled "Demo" everywhere; they reply once to each new
 * message, accept game invitations, and play simple moves. Runs only in local mode.
 */
export function runBots({ meId, members, outboxes, gameDocs, games, lang }: BotInput) {
  const store = useVybe.getState();
  const demos = members.filter((m) => m.demo);
  const mine = outboxes[meId] ?? emptyOutbox();

  // 1) Replies: answer when my latest message to a demo member is newer than their latest reply.
  for (const d of demos) {
    const myLast = mine.threads[d.id]?.msgs.at(-1);
    const theirs = outboxes[d.id] ?? emptyOutbox();
    const theirLast = theirs.threads[meId]?.msgs.at(-1);
    if (myLast && (!theirLast || theirLast.at < myLast.at)) {
      const pool = REPLIES[lang];
      const n = theirs.threads[meId]?.msgs.length ?? 0;
      writeLocalAs('outbox', d.id, appendMessage(theirs, meId, { id: `b${Date.now().toString(36)}`, at: new Date().toISOString(), text: pool[n % pool.length] }) as unknown as Record<string, unknown>);
      return; // one action per tick keeps the demo readable
    }
  }

  // 2) Games against demo members.
  const docOf = (id: string) => gameDocs.find((g) => g.id === id)?.doc ?? { v: 1 as const, games: {} };
  const writeHalf = (botId: string, gid: string, half: GameHalf) => {
    const doc = docOf(botId);
    writeLocalAs('games', botId, { v: 1, games: { ...doc.games, [gid]: { ...half, updatedAt: new Date().toISOString() } } });
  };
  for (const g of games) {
    const botId = g.host === meId ? g.guest : g.host;
    if (!demos.some((d) => d.id === botId)) continue;
    const seat = g.host === botId ? 'host' : 'guest';
    const half = docOf(botId).games[g.id];
    if (g.status === 'invited' && seat === 'guest' && !half) {
      writeHalf(botId, g.id, { type: g.type, host: g.host, guest: g.guest, createdAt: new Date().toISOString(), updatedAt: '', moves: [], commits: [], reveals: [], resigned: false });
      return;
    }
    if (!half || g.status !== 'active') continue;
    if ((g.type === 'ttt' || g.type === 'c4') && g.turn === seat) {
      writeHalf(botId, g.id, { ...half, moves: [...half.moves, botMove(g, seat)] });
      return;
    }
    if (g.type === 'rps') {
      const round = half.commits.length;
      if (g.rps.needs[seat] === 'choose') {
        const c = Math.floor(Math.random() * 3);
        const s = Math.random().toString(36).slice(2, 14);
        store.setCommunityDocs((x) => ({ ...x, [`botsecret/${g.id}:${round}`]: { c, s } }));
        writeHalf(botId, g.id, { ...half, commits: [...half.commits, commitFor(c, s)] });
        return;
      }
      if (g.rps.needs[seat] === 'reveal') {
        const sec = useVybe.getState().communityDocs[`botsecret/${g.id}:${half.reveals.length}`] as { c: number; s: string } | undefined;
        if (sec) { writeHalf(botId, g.id, { ...half, reveals: [...half.reveals, sec] }); return; }
      }
    }
  }

  // 3) Once: Mira challenges you to Tic-Tac-Toe, so the invitation flow can be tried.
  const flags = (store.communityDocs['private/botflags'] as Record<string, boolean>) ?? {};
  if (!flags.miraInvite && demos.some((d) => d.id === 'demo-mira') && members.some((m) => m.id === meId)) {
    store.setCommunityDocs((x) => ({ ...x, 'private/botflags': { ...flags, miraInvite: true } }));
    writeHalf('demo-mira', `gmira${Date.now().toString(36)}`, { type: 'ttt', host: 'demo-mira', guest: meId, createdAt: new Date().toISOString(), updatedAt: '', moves: [4], commits: [], reveals: [], resigned: false });
  }
}
