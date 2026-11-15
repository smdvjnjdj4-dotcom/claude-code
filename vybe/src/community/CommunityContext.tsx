import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVybe } from '@/store/useVybe';
import { connectLive, type CommunityBackend, type Collection, type RawDoc, type SyncStatus } from './backend';
import { localBackend } from './local';
import { parseMember, relation, toDoc } from './model';
import type { Member, MemberDoc } from './types';
import { LIMITS } from './types';
import { appendMessage, emptyOutbox, parseOutbox, type OutboxDoc, type StoredMessage } from './messages';
import { collectGames, commitFor, emptyGames, parseGames, type GameHalf, type GameType, type GameView, type GamesDoc, type Seat } from './games';
import { encryptText, decryptText, generateKeyPair, sharedKey, type KeyPairJwk } from './e2ee';
import { runBots } from './bots';
import { todayKey } from '@/lib/date';
import { uid } from '@/lib/id';

export interface CommunityState {
  backend: CommunityBackend | null;
  status: SyncStatus;
  members: Member[];
  me: Member | null;
  people: Record<string, { name: string; avatarUrl: string }>;
  outboxes: Record<string, OutboxDoc>;
  games: GameView[];
  myGames: GamesDoc;
  /** Updates your own member document. */
  save: (fn: (doc: MemberDoc) => MemberDoc) => Promise<boolean>;
  create: (doc: MemberDoc) => Promise<boolean>;
  sendMessage: (to: Member, text: string) => Promise<boolean>;
  /** Decrypts (live) or returns (local) the text of a message between you and `peer`. */
  readMessage: (peer: Member, msg: StoredMessage) => Promise<string | null>;
  canEncryptWith: (peer: Member) => boolean;
  newGame: (type: GameType, opponent: Member) => Promise<string | null>;
  acceptGame: (g: GameView) => Promise<void>;
  playMove: (g: GameView, move: number) => Promise<void>;
  chooseRps: (g: GameView, choice: number) => Promise<void>;
  resign: (g: GameView) => Promise<void>;
  removeGame: (g: GameView) => Promise<void>;
}

const Ctx = createContext<CommunityState | null>(null);
export function useCommunity(): CommunityState {
  const c = useContext(Ctx);
  if (!c) throw new Error('CommunityProvider missing');
  return c;
}
export const seatOf = (g: GameView, id: string | null | undefined): Seat | null => (id === g.host ? 'host' : id === g.guest ? 'guest' : null);

let livePromise: Promise<CommunityBackend | null> | null = null;
const getLive = () => (livePromise ??= connectLive().catch(() => null));

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<CommunityBackend | null>(null);
  const [status, setStatus] = useState<SyncStatus>('loading');
  const [raw, setRaw] = useState<Record<Collection, RawDoc[]>>({ members: [], outbox: [], games: [] });
  const [people, setPeople] = useState<CommunityState['people']>({});
  const [keys, setKeys] = useState<KeyPairJwk | null>(null);
  const { toast, communityReward, lang } = useVybe(useShallow((s) => ({ toast: s.toast, communityReward: s.communityReward, lang: s.settings.lang })));
  const optimistic = useRef<Partial<Record<Collection, Record<string, unknown>>>>({});

  useEffect(() => {
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    const hasRuntime = !!(window as unknown as { claude?: unknown }).claude;
    (hasRuntime ? getLive() : Promise.resolve(null)).then((live) => {
      if (cancelled) return;
      const b = live ?? localBackend();
      setBackend(b);
      unsubs.push(b.subscribe('members', (d) => { delete optimistic.current.members; setRaw((r) => ({ ...r, members: d })); }, setStatus));
      unsubs.push(b.subscribe('outbox', (d) => { delete optimistic.current.outbox; setRaw((r) => ({ ...r, outbox: d })); }));
      unsubs.push(b.subscribe('games', (d) => { delete optimistic.current.games; setRaw((r) => ({ ...r, games: d })); }));
    });
    return () => { cancelled = true; unsubs.forEach((u) => u()); };
  }, []);

  const meId = backend?.meId ?? null;
  const withOptimistic = (col: Collection, docs: RawDoc[]): RawDoc[] => {
    const o = optimistic.current[col];
    if (!o || !meId) return docs;
    return docs.some((d) => d.id === meId) ? docs.map((d) => (d.id === meId ? { id: meId, data: o } : d)) : [{ id: meId, data: o }, ...docs];
  };

  const members = useMemo(() => withOptimistic('members', raw.members).map((d) => {
    const m = parseMember(d.id, d.data);
    if (m && d.id.startsWith('demo-')) m.demo = true;
    return m;
  }).filter((m): m is Member => !!m), [raw.members]); // eslint-disable-line react-hooks/exhaustive-deps
  const me = meId ? members.find((m) => m.id === meId) ?? null : null;

  const outboxes = useMemo(() => Object.fromEntries(withOptimistic('outbox', raw.outbox).map((d) => [d.id, parseOutbox(d.data)])), [raw.outbox]); // eslint-disable-line react-hooks/exhaustive-deps
  const gameDocs = useMemo(() => withOptimistic('games', raw.games).map((d) => ({ id: d.id, doc: parseGames(d.data) })), [raw.games]); // eslint-disable-line react-hooks/exhaustive-deps
  const myGames = (meId && gameDocs.find((d) => d.id === meId)?.doc) || emptyGames();
  const games = useMemo(() => (meId ? collectGames(gameDocs, meId) : []), [gameDocs, meId]);

  const idsKey = members.map((m) => m.id).join(',');
  useEffect(() => {
    if (!backend?.people || !idsKey) return;
    backend.people(idsKey.split(',')).then(setPeople).catch(() => undefined);
  }, [backend, idsKey]);

  const fail = useCallback((e: unknown) => {
    const code = (e as { code?: string }).code;
    toast(code === 'quota_exceeded'
      ? (lang === 'de' ? 'Speicher der Community ist voll.' : 'Community storage is full.')
      : (lang === 'de' ? 'Speichern fehlgeschlagen. Bitte erneut versuchen.' : 'Saving failed. Please try again.'), 'err');
  }, [toast, lang]);

  const writeCol = useCallback(async (col: Collection, data: Record<string, unknown>) => {
    if (!backend?.canWrite || !meId) return false;
    optimistic.current[col] = data;
    setRaw((r) => ({ ...r })); // re-render with the optimistic copy
    try { await backend.write(col, data); return true; } catch (e) { delete optimistic.current[col]; setRaw((r) => ({ ...r })); fail(e); return false; }
  }, [backend, meId, fail]);

  // ------------------------------------------------------------- members
  const save = useCallback(async (fn: (doc: MemberDoc) => MemberDoc) => {
    if (!me) return false;
    const next = fn(me);
    const ok = await writeCol('members', toDoc(next) as unknown as Record<string, unknown>);
    if (ok && next.posts.length > me.posts.length) communityReward(`post:${todayKey()}`, 10, 'community:post');
    return ok;
  }, [me, writeCol, communityReward]);
  const create = useCallback(async (doc: MemberDoc) => writeCol('members', toDoc({ ...doc, pub: keys ? { x: keys.pub.x!, y: keys.pub.y! } : null }) as unknown as Record<string, unknown>), [writeCol, keys]);

  // ------------------------------------------------------------- keys (live only)
  useEffect(() => {
    if (backend?.mode !== 'live' || !backend.canWrite || keys) return;
    (async () => {
      let k = (await backend.getPrivate('keys').catch(() => null)) as KeyPairJwk | null;
      if (!k?.priv?.d || !k.pub?.x) {
        k = await generateKeyPair();
        await backend.setPrivate('keys', k as unknown as Record<string, unknown>).catch(() => undefined);
      }
      setKeys(k);
    })();
  }, [backend, keys]);
  useEffect(() => {
    if (!keys || !me || backend?.mode !== 'live') return;
    if (me.pub?.x !== keys.pub.x || me.pub?.y !== keys.pub.y) save((d) => ({ ...d, pub: { x: keys.pub.x!, y: keys.pub.y! } }));
  }, [keys, me?.pub?.x, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const canEncryptWith = useCallback((peer: Member) => backend?.mode !== 'live' || (!!keys && !!peer.pub), [backend, keys]);

  // ------------------------------------------------------------- messages
  const myOutbox = (meId && outboxes[meId]) || emptyOutbox();
  const sendMessage = useCallback(async (to: Member, text: string) => {
    const t = text.trim().slice(0, LIMITS.message);
    if (!t || !meId) return false;
    let msg: StoredMessage = { id: uid('m').slice(0, 40), at: new Date().toISOString() };
    if (backend?.mode === 'live') {
      if (!keys || !to.pub) return false;
      msg = { ...msg, ...(await encryptText(await sharedKey(keys.priv, to.pub), t)) };
    } else msg.text = t;
    const ok = await writeCol('outbox', appendMessage(myOutbox, to.id, msg) as unknown as Record<string, unknown>);
    if (ok) communityReward(`msg:${todayKey()}`, 5, 'community:message');
    return ok;
  }, [backend, keys, meId, myOutbox, writeCol, communityReward]);
  const readMessage = useCallback(async (peer: Member, msg: StoredMessage) => {
    if (msg.text !== undefined) return msg.text;
    if (!keys || !peer.pub || !msg.iv || !msg.ct) return null;
    return decryptText(await sharedKey(keys.priv, peer.pub), msg.iv, msg.ct);
  }, [keys]);

  // ------------------------------------------------------------- games
  const writeHalf = useCallback(async (id: string, half: GameHalf | null) => {
    const next: GamesDoc = { v: 1, games: { ...myGames.games } };
    if (half) next.games[id] = { ...half, updatedAt: new Date().toISOString() };
    else delete next.games[id];
    // keep the document small: drop the oldest entries beyond 40
    const ids = Object.keys(next.games).sort((a, b) => next.games[a].updatedAt.localeCompare(next.games[b].updatedAt));
    for (const old of ids.slice(0, Math.max(0, ids.length - 40))) delete next.games[old];
    await writeCol('games', next as unknown as Record<string, unknown>);
  }, [myGames, writeCol]);

  const blankHalf = (type: GameType, host: string, guest: string): GameHalf => ({ type, host, guest, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), moves: [], commits: [], reveals: [], resigned: false });
  const newGame = useCallback(async (type: GameType, opponent: Member) => {
    if (!meId) return null;
    const id = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await writeHalf(id, blankHalf(type, meId, opponent.id));
    return id;
  }, [meId, writeHalf]);
  const myHalf = (g: GameView) => myGames.games[g.id];
  const acceptGame = useCallback(async (g: GameView) => { if (meId && !myHalf(g)) await writeHalf(g.id, blankHalf(g.type, g.host, g.guest)); }, [meId, writeHalf, myGames]); // eslint-disable-line react-hooks/exhaustive-deps
  const playMove = useCallback(async (g: GameView, move: number) => {
    const h = myHalf(g);
    if (!h || g.status !== 'active' || g.turn !== seatOf(g, meId)) return;
    await writeHalf(g.id, { ...h, moves: [...h.moves, move] });
  }, [meId, writeHalf, myGames]); // eslint-disable-line react-hooks/exhaustive-deps
  const secrets = useVybe((s) => s.communityDocs);
  const setDocs = useVybe((s) => s.setCommunityDocs);
  const chooseRps = useCallback(async (g: GameView, choice: number) => {
    const h = myHalf(g);
    const seat = seatOf(g, meId);
    if (!h || !seat || g.rps.needs[seat] !== 'choose') return;
    const salt = uid().replace(/[^a-z0-9]/gi, '').slice(0, 24);
    const round = h.commits.length;
    // The choice stays secret on this device until both have chosen.
    setDocs((d) => ({ ...d, [`secret/${g.id}:${round}`]: { c: choice, s: salt } }));
    await writeHalf(g.id, { ...h, commits: [...h.commits, commitFor(choice, salt)] });
  }, [meId, writeHalf, myGames, setDocs]); // eslint-disable-line react-hooks/exhaustive-deps
  const resign = useCallback(async (g: GameView) => { const h = myHalf(g); if (h) await writeHalf(g.id, { ...h, resigned: true }); }, [writeHalf, myGames]); // eslint-disable-line react-hooks/exhaustive-deps
  const removeGame = useCallback(async (g: GameView) => { if (myHalf(g)) await writeHalf(g.id, null); }, [writeHalf, myGames]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reveal own RPS choice once both have committed.
  useEffect(() => {
    for (const g of games) {
      const seat = seatOf(g, meId);
      if (g.type !== 'rps' || !seat || g.rps.needs[seat] !== 'reveal') continue;
      const h = myGames.games[g.id];
      const round = h?.reveals.length ?? 0;
      const sec = secrets[`secret/${g.id}:${round}`] as { c: number; s: string } | undefined;
      if (h && sec && h.commits.length > round) writeHalf(g.id, { ...h, reveals: [...h.reveals, sec] });
    }
  }, [games]); // eslint-disable-line react-hooks/exhaustive-deps

  // XP: a finished game and each new mutual connection, once each.
  useEffect(() => {
    for (const g of games) if ((g.status === 'won' || g.status === 'draw') && g.resignedBy !== seatOf(g, meId)) communityReward(`game:${g.id}`, 10, 'community:game');
  }, [games, meId, communityReward]);
  useEffect(() => {
    if (!me) return;
    for (const m of members) if (relation(me, m) === 'connected') communityReward(`connect:${m.id}`, 15, 'community:connect');
  }, [members, me, communityReward]);

  // Demo members answer messages and play along — standalone app only.
  useEffect(() => {
    if (backend?.mode !== 'local' || !meId) return;
    const t = setTimeout(() => runBots({ meId, members, outboxes, gameDocs, games, lang }), 900);
    return () => clearTimeout(t);
  }, [backend, meId, members, outboxes, gameDocs, games, lang]);

  const value = useMemo<CommunityState>(() => ({
    backend, status, members, me, people, outboxes, games, myGames,
    save, create, sendMessage, readMessage, canEncryptWith, newGame, acceptGame, playMove, chooseRps, resign, removeGame,
  }), [backend, status, members, me, people, outboxes, games, myGames, save, create, sendMessage, readMessage, canEncryptWith, newGame, acceptGame, playMove, chooseRps, resign, removeGame]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
