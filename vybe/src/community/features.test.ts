import { describe, expect, it } from 'vitest';
import { accessoryFor, appendMessage, chatStreak, emptyOutbox, parseOutbox } from './messages';
import { collectGames, commitFor, deriveGame, parseGames, rpsWinner, botMove, type GameHalf } from './games';
import { sha256 } from './sha256';
import { decryptText, encryptText, generateKeyPair, sharedKey } from './e2ee';
import { canMessage, cleanLink, emptyMemberDoc, emptyProfile, parseMember } from './model';
import { addDays, todayKey } from '@/lib/date';
import type { Member } from './types';

const half = (p: Partial<GameHalf>): GameHalf => ({ type: 'ttt', host: 'a', guest: 'b', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', moves: [], commits: [], reveals: [], resigned: false, ...p });
const member = (id: string, patch: Partial<Member['profile']> = {}): Member => ({ ...emptyMemberDoc({ ...emptyProfile(id.toUpperCase()), ...patch }), id });

describe('chat streaks', () => {
  const t = todayKey();
  it('counts only days on which both wrote, alive through today', () => {
    const mine = [addDays(t, -3), addDays(t, -2), addDays(t, -1)];
    const theirs = [addDays(t, -3), addDays(t, -2), addDays(t, -1)];
    expect(chatStreak(mine, theirs, t)).toBe(3);
    expect(chatStreak([...mine, t], [...theirs, t], t)).toBe(4);
    expect(chatStreak(mine, [addDays(t, -2), addDays(t, -1)], t)).toBe(2);
    expect(chatStreak([addDays(t, -2)], [addDays(t, -2)], t)).toBe(0); // a full day passed
  });
  it('awards accessories at 3, 7, 30 and 100 days', () => {
    expect(accessoryFor(2)).toBeNull();
    expect(accessoryFor(3)?.id).toBe('spark');
    expect(accessoryFor(7)?.id).toBe('flame');
    expect(accessoryFor(45)?.id).toBe('comet');
    expect(accessoryFor(100)?.id).toBe('supernova');
  });
  it('records the send day once and caps thread length', () => {
    let d = emptyOutbox();
    for (let i = 0; i < 80; i++) d = appendMessage(d, 'b', { id: `m${i}`, at: new Date().toISOString(), text: 'hi' });
    expect(d.threads.b.msgs).toHaveLength(60);
    expect(d.threads.b.days).toEqual([todayKey()]);
    const parsed = parseOutbox({ threads: { b: { msgs: [{ id: 'x', at: 'nope', text: 'a' }, { id: 'y', at: new Date().toISOString(), text: '<b>ok</b>' }], days: ['bad', '2026-01-01'] } } });
    expect(parsed.threads.b.msgs.map((m) => m.id)).toEqual(['y']);
    expect(parsed.threads.b.days).toEqual(['2026-01-01']);
  });
});

describe('messaging rules', () => {
  it('allows connections, fans of creators, and replies', () => {
    const a = { ...member('a'), follows: ['b'], following: ['c'] };
    const b = { ...member('b'), follows: ['a'] };
    const c = member('c', { accountType: 'creator' });
    const d = member('d');
    expect(canMessage(a, b, false)).toBe(true);
    expect(canMessage(a, c, false)).toBe(true);
    expect(canMessage(a, d, false)).toBe(false);
    expect(canMessage(a, d, true)).toBe(true);
    expect(canMessage({ ...a, blocked: ['b'] }, b, true)).toBe(false);
  });
  it('sanitises creator links and handles', () => {
    expect(cleanLink('instagram', '@sam.draws')).toBe('sam.draws');
    expect(cleanLink('instagram', 'javascript:alert(1)')).toBe('');
    expect(cleanLink('website', 'http://example.com')).toBe('');
    expect(cleanLink('website', 'example.com')).toBe('https://example.com/');
    const m = parseMember('x', { profile: { nickname: 'Sam', handle: 'Bad Handle!', accountType: 'creator', links: [{ platform: 'tiktok', value: '@ok_1' }, { platform: 'evil', value: 'x' }] } })!;
    expect(m.profile.handle).toBe('');
    expect(m.profile.accountType).toBe('creator');
    expect(m.profile.links).toEqual([{ platform: 'tiktok', value: 'ok_1' }]);
  });
});

describe('games', () => {
  it('sha256 matches the standard test vector', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
  it('tic-tac-toe: alternating turns, win detection, invalid moves ignored', () => {
    const g = deriveGame('g', half({ moves: [0, 1, 2] }), half({ moves: [3, 4] }))!;
    expect(g.status).toBe('won');
    expect(g.winner).toBe('host');
    const bad = deriveGame('g', half({ moves: [0, 1] }), half({ moves: [0] }))!; // guest plays an occupied cell
    expect(bad.board.filter(Boolean)).toHaveLength(1);
    expect(bad.turn).toBe('guest');
    expect(deriveGame('g', half({}), undefined)!.status).toBe('invited');
  });
  it('connect four: pieces stack and four in a column wins', () => {
    const g = deriveGame('g', half({ type: 'c4', moves: [0, 0, 0, 0] }), half({ type: 'c4', moves: [1, 1, 1] }))!;
    expect(g.status).toBe('won');
    expect(g.winLine).toHaveLength(4);
    expect(g.board[35]).toBe('host'); // bottom-left
  });
  it('rock-paper-scissors: choices stay hidden until revealed and must match the commitment', () => {
    expect(rpsWinner(0, 2)).toBe('a');
    expect(rpsWinner(1, 0)).toBe('a');
    expect(rpsWinner(2, 1)).toBe('a');
    const h = half({ type: 'rps', commits: [commitFor(0, 's1')] });
    const gu = half({ type: 'rps', commits: [commitFor(2, 's2')] });
    let v = deriveGame('g', h, gu)!;
    expect(v.rps.needs).toEqual({ host: 'reveal', guest: 'reveal' });
    v = deriveGame('g', { ...h, reveals: [{ c: 1, s: 's1' }] }, { ...gu, reveals: [{ c: 2, s: 's2' }] })!; // host lies
    expect(v.rps.rounds[0].winner).toBeNull();
    v = deriveGame('g', { ...h, reveals: [{ c: 0, s: 's1' }], commits: [h.commits[0], commitFor(0, 's3')], }, { ...gu, reveals: [{ c: 2, s: 's2' }], commits: [gu.commits[0], commitFor(2, 's4')] })!;
    expect(v.rps.score.host).toBe(1);
    v = deriveGame('g', { ...h, commits: [h.commits[0], commitFor(0, 's3')], reveals: [{ c: 0, s: 's1' }, { c: 0, s: 's3' }] }, { ...gu, commits: [gu.commits[0], commitFor(2, 's4')], reveals: [{ c: 2, s: 's2' }, { c: 2, s: 's4' }] })!;
    expect(v.status).toBe('won');
    expect(v.winner).toBe('host');
  });
  it('only accepts halves written by the player they belong to', () => {
    const docs = [
      { id: 'a', doc: parseGames({ games: { g1: half({ moves: [4] }) } }) },
      { id: 'x', doc: parseGames({ games: { g1: half({ moves: [0] }) } }) }, // a stranger forging the guest half
    ];
    const games = collectGames(docs, 'a');
    expect(games[0].status).toBe('invited');
  });
  it('the demo bot blocks an immediate loss', () => {
    const g = deriveGame('g', half({ moves: [0, 1] }), half({ moves: [4] }))!;
    expect(botMove(g, 'guest')).toBe(2);
  });
});

describe('end-to-end encryption', () => {
  it('both sides derive the same key; others cannot read', async () => {
    const a = await generateKeyPair();
    const b = await generateKeyPair();
    const eve = await generateKeyPair();
    const kab = await sharedKey(a.priv, { x: b.pub.x!, y: b.pub.y! });
    const kba = await sharedKey(b.priv, { x: a.pub.x!, y: a.pub.y! });
    const kev = await sharedKey(eve.priv, { x: a.pub.x!, y: a.pub.y! });
    const box = await encryptText(kab, 'Hallo 👋');
    expect(await decryptText(kba, box.iv, box.ct)).toBe('Hallo 👋');
    expect(await decryptText(kev, box.iv, box.ct)).toBeNull();
  });
});
