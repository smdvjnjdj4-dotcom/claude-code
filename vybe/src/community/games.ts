import { sha256 } from './sha256';

export type GameType = 'ttt' | 'c4' | 'rps';
export const GAME_TYPES: GameType[] = ['ttt', 'c4', 'rps'];

/**
 * One player's half of a game. Each player only writes their own half (in their own document);
 * the game state is derived from both halves. The host moves first.
 */
export interface GameHalf {
  type: GameType;
  host: string;
  guest: string;
  createdAt: string;
  moves: number[]; // ttt: cell 0-8, c4: column 0-6
  commits: string[]; // rps: sha256(`${choice}:${salt}`) per round
  reveals: { c: number; s: string }[]; // rps: revealed choice + salt per round
  resigned: boolean;
  updatedAt: string;
}
export interface GamesDoc { v: 1; games: Record<string, GameHalf> }
export function emptyGames(): GamesDoc { return { v: 1, games: {} }; }

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 200;
export function parseGames(raw: unknown): GamesDoc {
  const out = emptyGames();
  const g = (raw as { games?: unknown } | null)?.games;
  if (!g || typeof g !== 'object') return out;
  for (const [id, h] of Object.entries(g as Record<string, unknown>).slice(0, 60)) {
    const x = h as Record<string, unknown>;
    if (!x || !GAME_TYPES.includes(x.type as GameType) || !isId(x.host) || !isId(x.guest) || id.length > 64) continue;
    const nums = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= max).slice(0, 42) : []);
    out.games[id] = {
      type: x.type as GameType, host: x.host, guest: x.guest,
      createdAt: typeof x.createdAt === 'string' ? x.createdAt : new Date(0).toISOString(),
      updatedAt: typeof x.updatedAt === 'string' ? x.updatedAt : new Date(0).toISOString(),
      moves: nums(x.moves, x.type === 'c4' ? 6 : 8),
      commits: (Array.isArray(x.commits) ? x.commits : []).filter((c): c is string => typeof c === 'string' && /^[0-9a-f]{64}$/.test(c)).slice(0, 9),
      reveals: (Array.isArray(x.reveals) ? x.reveals : []).flatMap((r) => {
        const o = r as Record<string, unknown>;
        return o && Number.isInteger(o.c) && (o.c as number) >= 0 && (o.c as number) <= 2 && typeof o.s === 'string' && o.s.length <= 64 ? [{ c: o.c as number, s: o.s }] : [];
      }).slice(0, 9),
      resigned: x.resigned === true,
    };
  }
  return out;
}

export const commitFor = (choice: number, salt: string) => sha256(`${choice}:${salt}`);

// ---------------------------------------------------------------- derived state

export type Seat = 'host' | 'guest';
export interface GameView {
  id: string;
  type: GameType;
  host: string;
  guest: string;
  status: 'invited' | 'active' | 'won' | 'draw';
  winner: Seat | null;
  turn: Seat | null; // whose move it is (null when nobody needs to act or both act at once in rps)
  board: (Seat | null)[]; // ttt: 9 cells, c4: 42 cells (row-major, row 0 at top)
  winLine: number[];
  rps: { rounds: { host: number | null; guest: number | null; winner: Seat | 'draw' | null }[]; score: Record<Seat, number>; needs: Record<Seat, 'choose' | 'reveal' | null> };
  updatedAt: string;
  resignedBy: Seat | null;
}

const TTT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function c4Win(board: (Seat | null)[], idx: number): number[] {
  const who = board[idx];
  const r0 = Math.floor(idx / 7);
  const c0 = idx % 7;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [idx];
    for (const s of [1, -1]) {
      let r = r0 + dr * s;
      let c = c0 + dc * s;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r * 7 + c] === who) { line.push(r * 7 + c); r += dr * s; c += dc * s; }
    }
    if (line.length >= 4) return line;
  }
  return [];
}

/** Rock(0) beats Scissors(2), Paper(1) beats Rock(0), Scissors(2) beats Paper(1). */
export function rpsWinner(a: number, b: number): 'a' | 'b' | 'draw' {
  if (a === b) return 'draw';
  return (a - b + 3) % 3 === 1 ? 'a' : 'b';
}

/** Merge both halves into the game state. Invalid or out-of-turn moves are ignored. */
export function deriveGame(id: string, host: GameHalf | undefined, guest: GameHalf | undefined): GameView | null {
  const base = host ?? guest;
  if (!base) return null;
  const type = base.type;
  const updatedAt = [host?.updatedAt, guest?.updatedAt].filter(Boolean).sort().pop() ?? base.createdAt;
  const view: GameView = {
    id, type, host: base.host, guest: base.guest, status: 'active', winner: null, turn: null,
    board: Array(type === 'c4' ? 42 : 9).fill(null), winLine: [],
    rps: { rounds: [], score: { host: 0, guest: 0 }, needs: { host: null, guest: null } }, updatedAt, resignedBy: null,
  };
  if (!host) return null; // only the host can start a game
  if (!guest) { view.status = 'invited'; return view; }
  if (host.resigned || guest.resigned) {
    view.status = 'won';
    view.resignedBy = host.resigned ? 'host' : 'guest';
    view.winner = host.resigned ? 'guest' : 'host';
    return view;
  }

  if (type === 'ttt' || type === 'c4') {
    const total = host.moves.length + guest.moves.length;
    for (let i = 0; i < total; i++) {
      const seat: Seat = i % 2 === 0 ? 'host' : 'guest';
      const mv = (seat === 'host' ? host.moves : guest.moves)[Math.floor(i / 2)];
      if (mv === undefined) break;
      let idx = -1;
      if (type === 'ttt') { if (mv > 8 || view.board[mv]) break; idx = mv; }
      else { if (mv > 6) break; for (let r = 5; r >= 0; r--) if (!view.board[r * 7 + mv]) { idx = r * 7 + mv; break; } if (idx < 0) break; }
      view.board[idx] = seat;
      const line = type === 'ttt' ? (TTT_LINES.find((l) => l.includes(idx) && l.every((c) => view.board[c] === seat)) ?? []) : c4Win(view.board, idx);
      if (line.length) { view.status = 'won'; view.winner = seat; view.winLine = line; return view; }
    }
    if (view.board.every(Boolean)) { view.status = 'draw'; return view; }
    // Next to move: host if equal counts (and moves consistent), guest otherwise.
    const placed = view.board.filter(Boolean).length;
    view.turn = placed % 2 === 0 ? 'host' : 'guest';
    return view;
  }

  // Rock-paper-scissors, best of 3 (first to 2 wins; draws are replayed, max 9 rounds).
  for (let r = 0; r < 9; r++) {
    const hc = host.commits[r];
    const gc = guest.commits[r];
    if (!hc || !gc) {
      view.rps.needs = { host: hc ? null : 'choose', guest: gc ? null : 'choose' };
      break;
    }
    const hr = host.reveals[r];
    const gr = guest.reveals[r];
    const hOk = hr && commitFor(hr.c, hr.s) === hc ? hr.c : null;
    const gOk = gr && commitFor(gr.c, gr.s) === gc ? gr.c : null;
    if (hOk === null || gOk === null) {
      view.rps.rounds.push({ host: hOk, guest: gOk, winner: null });
      view.rps.needs = { host: hOk === null ? 'reveal' : null, guest: gOk === null ? 'reveal' : null };
      break;
    }
    const w = rpsWinner(hOk, gOk);
    const winner: Seat | 'draw' = w === 'draw' ? 'draw' : w === 'a' ? 'host' : 'guest';
    view.rps.rounds.push({ host: hOk, guest: gOk, winner });
    if (winner !== 'draw') view.rps.score[winner]++;
    if (view.rps.score.host === 2 || view.rps.score.guest === 2) {
      view.status = 'won';
      view.winner = view.rps.score.host === 2 ? 'host' : 'guest';
      view.rps.needs = { host: null, guest: null };
      return view;
    }
    if (r === 8) { view.status = 'draw'; return view; }
  }
  return view;
}

/** Collect all games involving `meId` from everyone's games documents. */
export function collectGames(docs: { id: string; doc: GamesDoc }[], meId: string): GameView[] {
  const halves = new Map<string, { host?: GameHalf; guest?: GameHalf }>();
  for (const { id: owner, doc } of docs) {
    for (const [gid, h] of Object.entries(doc.games)) {
      if (h.host !== meId && h.guest !== meId) continue;
      const seat = owner === h.host ? 'host' : owner === h.guest ? 'guest' : null;
      if (!seat) continue; // a half must be written by the player it belongs to
      const e = halves.get(gid) ?? {};
      e[seat] = h;
      halves.set(gid, e);
    }
  }
  const out: GameView[] = [];
  for (const [gid, { host, guest }] of halves) {
    if (host && guest && (host.type !== guest.type || host.guest !== guest.guest || host.host !== guest.host)) continue;
    const v = deriveGame(gid, host, guest);
    if (v) out.push(v);
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ---------------------------------------------------------------- simple opponent AI (demo bot)

export function botMove(view: GameView, seat: Seat): number {
  const other: Seat = seat === 'host' ? 'guest' : 'host';
  if (view.type === 'ttt') {
    const empty = view.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    for (const who of [seat, other]) for (const l of TTT_LINES) {
      const cells = l.map((c) => view.board[c]);
      if (cells.filter((c) => c === who).length === 2 && cells.includes(null)) return l[cells.indexOf(null)];
    }
    if (empty.includes(4)) return 4;
    return empty[Math.floor(Math.random() * empty.length)];
  }
  // Connect four: win, block, else prefer centre columns.
  const open = [0, 1, 2, 3, 4, 5, 6].filter((c) => !view.board[c]);
  const drop = (c: number) => { for (let r = 5; r >= 0; r--) if (!view.board[r * 7 + c]) return r * 7 + c; return -1; };
  for (const who of [seat, other]) for (const c of open) {
    const idx = drop(c);
    const b = [...view.board];
    b[idx] = who;
    if (c4Win(b, idx).length) return c;
  }
  const pref = [3, 2, 4, 1, 5, 0, 6].filter((c) => open.includes(c));
  return Math.random() < 0.7 ? pref[0] : pref[Math.floor(Math.random() * pref.length)];
}
