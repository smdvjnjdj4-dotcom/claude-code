import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, SectionHeader } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { ParticleBurst } from '@/components/ui/Particles';
import { useCommunity, seatOf } from '@/community/CommunityContext';
import { useCT, type CKey } from '@/community/i18n';
import { relation } from '@/community/model';
import { GAME_TYPES, type GameType, type GameView, type Seat } from '@/community/games';
import type { Member } from '@/community/types';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { MemberAvatar, MemberName } from './parts';

const GAME_ICON: Record<GameType, string> = { ttt: 'Grid3x3', c4: 'Circle', rps: 'Hand' };
const RPS_ICON = ['Circle', 'Square', 'Scissors'];

type Bucket = 'turn' | 'invites' | 'waiting' | 'done';
function bucketOf(g: GameView, seat: Seat): Bucket {
  if (g.status === 'invited') return seat === 'guest' ? 'invites' : 'waiting';
  if (g.status !== 'active') return 'done';
  if (g.type === 'rps') return g.rps.needs[seat] === 'choose' ? 'turn' : 'waiting';
  return g.turn === seat ? 'turn' : 'waiting';
}

export function Games({ challengeId, onChallengeHandled }: { challengeId: string | null; onChallengeHandled: () => void }) {
  const { ct } = useCT();
  const c = useCommunity();
  const [newOpen, setNewOpen] = useState(false);
  const [preOpp, setPreOpp] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { if (challengeId) { setPreOpp(challengeId); setNewOpen(true); onChallengeHandled(); } }, [challengeId, onChallengeHandled]);
  const me = c.me;
  const groups = useMemo(() => {
    const out: Record<Bucket, GameView[]> = { turn: [], invites: [], waiting: [], done: [] };
    if (!me) return out;
    for (const g of c.games) { const s = seatOf(g, me.id); if (s) out[bucketOf(g, s)].push(g); }
    return out;
  }, [c.games, me]);
  const open = openId ? c.games.find((g) => g.id === openId) ?? null : null;

  if (!me) return <Card><EmptyState icon="Gamepad2" title={ct('tab.games')} text={ct('feed.needProfile')} /></Card>;
  const sections: [Bucket, CKey][] = [['turn', 'game.sec.turn'], ['invites', 'game.sec.invites'], ['waiting', 'game.sec.waiting'], ['done', 'game.sec.done']];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {GAME_TYPES.map((t) => (
          <button key={t} onClick={() => { setPreOpp(null); setNewOpen(true); }} className="card flex flex-col items-center gap-2 rounded-3xl p-4 text-center transition hover:shadow-glow">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-accent text-white"><Icon name={GAME_ICON[t]} size={20} /></span>
            <span className="text-sm font-semibold">{ct(`game.${t}` as CKey)}</span>
            <span className="text-[11px] text-muted">{ct(`game.${t}Desc` as CKey)}</span>
          </button>
        ))}
      </div>
      {c.games.length === 0 ? <Card><EmptyState icon="Gamepad2" title={ct('game.empty')} text={ct('game.emptyText')} action={<Button icon="Plus" onClick={() => setNewOpen(true)}>{ct('game.new')}</Button>} /></Card> : (
        sections.filter(([b]) => groups[b].length).map(([b, label]) => (
          <section key={b}>
            <SectionHeader title={<span>{ct(label)} <span className="text-sm font-normal text-muted num">{groups[b].length}</span></span>} />
            <Card className="divide-y divide-line/5 p-1">{groups[b].map((g) => <GameRow key={g.id} g={g} onOpen={() => setOpenId(g.id)} />)}</Card>
          </section>
        ))
      )}
      <NewGameSheet open={newOpen} preselect={preOpp} onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); setOpenId(id); }} />
      <GameSheet game={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function useOpponent(g: GameView): Member | undefined {
  const c = useCommunity();
  const oppId = g.host === c.me?.id ? g.guest : g.host;
  return c.members.find((m) => m.id === oppId);
}

function statusText(g: GameView, seat: Seat, oppName: string, ct: ReturnType<typeof useCT>['ct']) {
  if (g.status === 'invited') return seat === 'guest' ? ct('game.invitedYou', { name: oppName }) : ct('game.waitingAccept', { name: oppName });
  if (g.status === 'draw') return ct('game.draw');
  if (g.status === 'won') return g.winner === seat ? ct('game.won') : ct('game.lost', { name: oppName });
  if (g.type === 'rps') return g.rps.needs[seat] === 'choose' ? ct('game.yourTurn') : ct('rps.waiting', { name: oppName });
  return g.turn === seat ? ct('game.yourTurn') : ct('game.theirTurn', { name: oppName });
}

function GameRow({ g, onOpen }: { g: GameView; onOpen: () => void }) {
  const { ct } = useCT();
  const c = useCommunity();
  const opp = useOpponent(g);
  const seat = seatOf(g, c.me?.id)!;
  const name = opp?.profile.nickname ?? '…';
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-line/[0.04]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent" style={{ background: 'rgb(var(--accent) / 0.13)' }}><Icon name={GAME_ICON[g.type]} size={18} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold"><span>{ct(`game.${g.type}` as CKey)}</span><span className="font-normal text-muted">vs. {name}</span>{opp?.demo && <Badge tone="warn">{ct('demoBot')}</Badge>}</div>
        <div className="text-xs text-muted">{statusText(g, seat, name, ct)}</div>
      </div>
      {g.type === 'rps' && g.status !== 'invited' && <span className="font-display text-sm font-bold num">{g.rps.score[seat]}:{g.rps.score[seat === 'host' ? 'guest' : 'host']}</span>}
      <Icon name="ChevronRight" size={16} className="text-faint" />
    </button>
  );
}

function NewGameSheet({ open, preselect, onClose, onCreated }: { open: boolean; preselect: string | null; onClose: () => void; onCreated: (id: string) => void }) {
  const { ct } = useCT();
  const c = useCommunity();
  const [type, setType] = useState<GameType>('ttt');
  const [opp, setOpp] = useState<string | null>(null);
  useEffect(() => { if (open) setOpp(preselect); }, [open, preselect]);
  const candidates = useMemo(() => c.members.filter((m) => relation(c.me, m) === 'connected'), [c.members, c.me]);
  const start = async () => {
    const o = c.members.find((m) => m.id === opp);
    if (!o) return;
    const id = await c.newGame(type, o);
    if (id) onCreated(id);
  };
  return (
    <Sheet open={open} onClose={onClose} title={ct('game.new')} footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>{ct('cancel')}</Button><Button className="flex-1" icon="Gamepad2" disabled={!opp || !c.backend?.canWrite} onClick={start}>{ct('game.invite')}</Button></>}>
      <div className="space-y-5">
        <div>
          <span className="label">{ct('game.pickType')}</span>
          <div className="grid grid-cols-3 gap-2">
            {GAME_TYPES.map((t) => (
              <button key={t} onClick={() => setType(t)} aria-pressed={type === t} className={cn('flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm transition', type === t ? 'border-accent/60 bg-accent/15' : 'hairline')}>
                <Icon name={GAME_ICON[t]} size={20} className="text-accent" />{ct(`game.${t}` as CKey)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">{ct('game.pickOpp')}</span>
          {candidates.length === 0 ? <p className="text-sm text-muted">{ct('conn.none')}</p> : (
            <div className="divide-y divide-line/5">
              {candidates.map((m) => (
                <button key={m.id} onClick={() => setOpp(m.id)} aria-pressed={opp === m.id} className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left', opp === m.id && 'bg-accent/10')}>
                  <MemberAvatar member={m} people={c.people} size={36} /><MemberName member={m} me={c.me} />
                  {opp === m.id && <Icon name="Check" size={16} className="ml-auto text-accent" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function GameSheet({ game, onClose }: { game: GameView | null; onClose: () => void }) {
  const { ct } = useCT();
  const c = useCommunity();
  const reduce = useReducedMotion();
  const opp = useOpponentSafe(game);
  if (!game) return <Sheet open={false} onClose={onClose} title=""><div /></Sheet>;
  const seat = seatOf(game, c.me?.id)!;
  const name = opp?.profile.nickname ?? '…';
  const finished = game.status === 'won' || game.status === 'draw';
  const iWon = game.status === 'won' && game.winner === seat;
  return (
    <Sheet open onClose={onClose} title={`${ct(`game.${game.type}` as CKey)} · ${name}`} footer={
      game.status === 'invited' && seat === 'guest' ? <><Button variant="secondary" className="flex-1" onClick={() => { c.removeGame(game); onClose(); }}>{ct('game.decline')}</Button><Button className="flex-1" onClick={() => c.acceptGame(game)}>{ct('game.accept')}</Button></>
      : finished ? <><Button variant="ghost" onClick={() => { c.removeGame(game); onClose(); }}>{ct('game.remove')}</Button>{opp && <Button className="flex-1" icon="Repeat" onClick={async () => { await c.newGame(game.type, opp); onClose(); }}>{ct('game.rematch')}</Button>}</>
      : game.status === 'active' ? <Button variant="ghost" icon="X" onClick={() => c.resign(game)}>{ct('game.resign')}</Button> : undefined
    }>
      <div className="flex flex-col items-center gap-4 pb-2">
        <div className="relative text-center">
          {iWon && !reduce && <ParticleBurst count={24} />}
          <p className={cn('font-display text-lg font-semibold', iWon && 'text-gradient')}>{statusText(game, seat, name, ct)}</p>
          {game.resignedBy && <p className="text-xs text-muted">{game.resignedBy === seat ? ct('feed.you') : name} {ct('game.resigned')}</p>}
          {opp?.demo && <Badge tone="warn" className="mt-1">{ct('demoBot')}</Badge>}
        </div>
        {game.type === 'ttt' && <TttBoard g={game} seat={seat} />}
        {game.type === 'c4' && <C4Board g={game} seat={seat} />}
        {game.type === 'rps' && <RpsPanel g={game} seat={seat} name={name} />}
        {game.type !== 'rps' && (
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><Piece type={game.type} who={seat} small />{ct('feed.you')}</span>
            <span className="flex items-center gap-1.5"><Piece type={game.type} who={seat === 'host' ? 'guest' : 'host'} small />{name}</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}
function useOpponentSafe(g: GameView | null) {
  const c = useCommunity();
  if (!g) return undefined;
  const id = g.host === c.me?.id ? g.guest : g.host;
  return c.members.find((m) => m.id === id);
}

function Piece({ type, who, small }: { type: GameType; who: Seat; small?: boolean }) {
  const s = small ? 14 : undefined;
  if (type === 'ttt') return <Icon name={who === 'host' ? 'X' : 'Circle'} size={s ?? 34} strokeWidth={2.6} className={who === 'host' ? 'text-accent' : 'text-accent2'} />;
  return <span className={cn('block rounded-full', small ? 'h-3.5 w-3.5' : 'h-full w-full', who === 'host' ? 'bg-gradient-accent' : 'bg-warn')} style={who === 'guest' ? { background: 'rgb(var(--warn))' } : undefined} />;
}

function TttBoard({ g, seat }: { g: GameView; seat: Seat }) {
  const c = useCommunity();
  const reduce = useReducedMotion();
  const mine = g.status === 'active' && g.turn === seat;
  return (
    <div className="grid w-full max-w-[280px] grid-cols-3 gap-2" role="grid">
      {g.board.map((v, i) => (
        <button key={i} disabled={!mine || !!v} onClick={() => c.playMove(g, i)} aria-label={`${i + 1}${v ? ` ${v}` : ''}`}
          className={cn('grid aspect-square place-items-center rounded-2xl border transition', g.winLine.includes(i) ? 'border-accent bg-accent/15' : 'hairline bg-line/[0.04]', mine && !v && 'hover:bg-accent/10')}>
          {v && <motion.span initial={reduce ? false : { scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}><Piece type="ttt" who={v} /></motion.span>}
        </button>
      ))}
    </div>
  );
}

function C4Board({ g, seat }: { g: GameView; seat: Seat }) {
  const c = useCommunity();
  const reduce = useReducedMotion();
  const mine = g.status === 'active' && g.turn === seat;
  return (
    <div className="w-full max-w-[340px] rounded-3xl bg-accent/10 p-2" style={{ background: 'rgb(var(--accent) / 0.1)' }}>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, col) => (
          <button key={col} disabled={!mine || !!g.board[col]} onClick={() => c.playMove(g, col)} aria-label={`Spalte ${col + 1}`} className="flex flex-col gap-1.5 rounded-xl p-0.5 transition enabled:hover:bg-line/10 disabled:cursor-default">
            {Array.from({ length: 6 }, (_, row) => {
              const idx = row * 7 + col;
              const v = g.board[idx];
              return (
                <span key={row} className={cn('relative aspect-square w-full rounded-full bg-bg/80', g.winLine.includes(idx) && 'ring-2 ring-fg')}>
                  {v && <motion.span className="absolute inset-0.5" initial={reduce ? false : { y: -(row + 1) * 36, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}><Piece type="c4" who={v} /></motion.span>}
                </span>
              );
            })}
          </button>
        ))}
      </div>
    </div>
  );
}

function RpsPanel({ g, seat, name }: { g: GameView; seat: Seat; name: string }) {
  const { ct } = useCT();
  const c = useCommunity();
  const other: Seat = seat === 'host' ? 'guest' : 'host';
  const need = g.rps.needs[seat];
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-center gap-6 font-display text-4xl font-bold num">
        <span className="text-accent">{g.rps.score[seat]}</span><span className="text-faint">:</span><span>{g.rps.score[other]}</span>
      </div>
      {g.rps.rounds.filter((r) => r.winner).length > 0 && (
        <ul className="space-y-1.5">
          {g.rps.rounds.filter((r) => r.winner).map((r, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl bg-line/[0.04] px-3 py-2 text-sm">
              <span className="text-faint">{ct('rps.round', { n: i + 1 })}</span>
              <span className="flex items-center gap-2"><Icon name={RPS_ICON[r[seat]!]} size={16} />{ct(`rps.${r[seat]}` as CKey)}</span>
              <span className={cn('text-xs font-semibold', r.winner === seat ? 'text-success' : r.winner === 'draw' ? 'text-muted' : 'text-danger')}>{r.winner === 'draw' ? '=' : r.winner === seat ? '+1' : '−'}</span>
              <span className="flex items-center gap-2 text-muted">{ct(`rps.${r[other]}` as CKey)}<Icon name={RPS_ICON[r[other]!]} size={16} /></span>
            </li>
          ))}
        </ul>
      )}
      {g.status === 'active' && (need === 'choose' ? (
        <div>
          <p className="mb-2 text-center text-sm text-muted">{ct('rps.choose')}</p>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((ch) => (
              <button key={ch} onClick={() => c.chooseRps(g, ch)} className="card flex flex-col items-center gap-2 rounded-2xl p-4 transition hover:shadow-glow">
                <Icon name={RPS_ICON[ch]} size={28} className="text-accent" /><span className="text-sm">{ct(`rps.${ch}` as CKey)}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-faint"><Icon name="Lock" size={10} className="mr-1 inline" />{ct('rps.hidden')}</p>
        </div>
      ) : (
        <p className="text-center text-sm text-muted">{need === 'reveal' || g.rps.needs[other] === 'reveal' ? ct('rps.revealing') : ct('rps.waiting', { name })}</p>
      ))}
    </div>
  );
}
