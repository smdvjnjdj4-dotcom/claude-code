import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, EmptyState, IconButton, Input } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useCommunity } from '@/community/CommunityContext';
import { useCT, type CKey } from '@/community/i18n';
import { canMessage } from '@/community/model';
import { accessoryFor, chatStreak, nextAccessory, ACCESSORIES, type StoredMessage } from '@/community/messages';
import { LIMITS, type Member } from '@/community/types';
import { useVybe } from '@/store/useVybe';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { MemberAvatar, MemberName } from './parts';
import { useNav } from './nav';

interface Line { msg: StoredMessage; mine: boolean }

function useThread(peer: Member | null) {
  const c = useCommunity();
  return useMemo(() => {
    if (!peer || !c.me) return { lines: [] as Line[], streak: 0 };
    const mineT = c.outboxes[c.me.id]?.threads[peer.id];
    const theirT = c.outboxes[peer.id]?.threads[c.me.id];
    const lines: Line[] = [...(mineT?.msgs ?? []).map((msg) => ({ msg, mine: true })), ...(theirT?.msgs ?? []).map((msg) => ({ msg, mine: false }))].sort((a, b) => a.msg.at.localeCompare(b.msg.at));
    return { lines, streak: chatStreak(mineT?.days ?? [], theirT?.days ?? []) };
  }, [c.outboxes, c.me, peer]);
}

/** Decrypts messages (live) or passes through plain text (local); results are cached per message id. */
function useTexts(peer: Member | null, msgs: StoredMessage[]) {
  const c = useCommunity();
  const [texts, setTexts] = useState<Record<string, string | null>>({});
  const key = msgs.map((m) => m.id).join(',');
  useEffect(() => {
    if (!peer) return;
    let alive = true;
    Promise.all(msgs.map(async (m) => [m.id, await c.readMessage(peer, m)] as const)).then((pairs) => { if (alive) setTexts(Object.fromEntries(pairs)); });
    return () => { alive = false; };
  }, [peer, key, c.readMessage]); // eslint-disable-line react-hooks/exhaustive-deps
  return texts;
}

const NO_READ: Record<string, string> = {};

export function StreakBadge({ streak, size = 'sm' }: { streak: number; size?: 'sm' | 'lg' }) {
  const { ct } = useCT();
  const acc = accessoryFor(streak);
  if (streak <= 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-semibold num', size === 'lg' ? 'bg-warn/15 px-3 py-1 text-sm text-warn' : 'bg-warn/12 px-2 py-0.5 text-[11px] text-warn')} style={{ background: 'rgb(var(--warn) / 0.13)' }}
      title={acc ? ct(`acc.${acc.id}` as CKey) : undefined}>
      <Icon name={acc?.icon ?? 'Flame'} size={size === 'lg' ? 15 : 12} />{streak}
      {acc && size === 'lg' && <span className="font-normal">· {ct(`acc.${acc.id}` as CKey)}</span>}
    </span>
  );
}

export function Chats({ openWith, onOpened }: { openWith: string | null; onOpened: () => void }) {
  const { ct, ago } = useCT();
  const c = useCommunity();
  const [peerId, setPeerId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const read = useVybe((s) => s.communityDocs['private/read'] as Record<string, string> | undefined) ?? NO_READ;
  useEffect(() => { if (openWith) { setPeerId(openWith); onOpened(); } }, [openWith, onOpened]);
  const me = c.me;

  const partners = useMemo(() => {
    if (!me) return [];
    const ids = new Set<string>(Object.keys(c.outboxes[me.id]?.threads ?? {}));
    for (const [from, ob] of Object.entries(c.outboxes)) if (from !== me.id && ob.threads[me.id]?.msgs.length) ids.add(from);
    return [...ids].map((id) => c.members.find((m) => m.id === id)).filter((m): m is Member => !!m && !me.blocked.includes(m.id) && !m.blocked.includes(me.id))
      .map((m) => {
        const mine = c.outboxes[me.id]?.threads[m.id];
        const theirs = c.outboxes[m.id]?.threads[me.id];
        const lastMine = mine?.msgs[mine.msgs.length - 1];
        const lastTheirs = theirs?.msgs[theirs.msgs.length - 1];
        const last = !lastTheirs || (lastMine && lastMine.at > lastTheirs.at) ? { msg: lastMine!, mine: true } : { msg: lastTheirs, mine: false };
        return { m, last, streak: chatStreak(mine?.days ?? [], theirs?.days ?? []), unread: !!lastTheirs && (!read[m.id] || read[m.id] < lastTheirs.at) };
      })
      .filter((p) => p.last.msg)
      .sort((a, b) => b.last.msg.at.localeCompare(a.last.msg.at));
  }, [c.outboxes, c.members, me, read]);

  const peer = peerId ? c.members.find((m) => m.id === peerId) ?? null : null;
  const eligible = useMemo(() => (me ? c.members.filter((m) => canMessage(me, m, !!c.outboxes[m.id]?.threads[me.id]?.msgs.length)) : []), [c.members, c.outboxes, me]);

  if (!me) return <Card><EmptyState icon="MessageCircle" title={ct('chat.title')} text={ct('feed.needProfile')} /></Card>;
  return (
    <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-5">
      <div className={cn('space-y-3 lg:col-span-2', peer && 'hidden lg:block')}>
        <Button className="w-full" icon="Plus" variant="secondary" onClick={() => setPicker(true)} disabled={!c.backend?.canWrite}>{ct('chat.new')}</Button>
        {partners.length === 0 ? <Card><EmptyState icon="MessageCircle" title={ct('chat.empty')} text={ct('chat.emptyText')} /></Card> : (
          <Card className="divide-y divide-line/5 p-1">
            {partners.map((p) => <ThreadRow key={p.m.id} peer={p.m} last={p.last} streak={p.streak} unread={p.unread} active={p.m.id === peerId} onClick={() => setPeerId(p.m.id)} ago={ago} />)}
          </Card>
        )}
        <AccessoryLegend />
      </div>
      <div className={cn('lg:col-span-3', !peer && 'hidden lg:block')}>
        {peer ? <ThreadView key={peer.id} peer={peer} onBack={() => setPeerId(null)} /> : <Card className="hidden h-full place-items-center p-10 text-sm text-faint lg:grid">{ct('chat.pick')}</Card>}
      </div>
      <Sheet open={picker} onClose={() => setPicker(false)} title={ct('chat.new')}>
        {eligible.length === 0 ? <p className="py-6 text-center text-sm text-muted">{ct('chat.cannot')}</p> : (
          <div className="divide-y divide-line/5">
            {eligible.map((m) => (
              <button key={m.id} className="flex w-full items-center gap-3 py-3 text-left" onClick={() => { setPeerId(m.id); setPicker(false); }}>
                <MemberAvatar member={m} people={c.people} size={40} /><MemberName member={m} me={me} />
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function ThreadRow({ peer, last, streak, unread, active, onClick, ago }: { peer: Member; last: Line; streak: number; unread: boolean; active: boolean; onClick: () => void; ago: (s: string) => string }) {
  const { ct } = useCT();
  const c = useCommunity();
  const texts = useTexts(peer, [last.msg]);
  const t = texts[last.msg.id];
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition', active ? 'bg-accent/10' : 'hover:bg-line/[0.04]')}>
      <MemberAvatar member={peer} people={c.people} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><MemberName member={peer} me={c.me} /><StreakBadge streak={streak} /></div>
        <div className={cn('truncate text-sm', unread ? 'font-semibold text-fg' : 'text-muted')}>
          {last.mine && ct('chat.you')}{t === undefined ? '…' : t === null ? ct('chat.undecryptable') : t}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[11px] text-faint">{ago(last.msg.at)}</span>
        {unread && <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-label="unread" />}
      </div>
    </button>
  );
}

function AccessoryLegend() {
  const { ct } = useCT();
  return (
    <Card className="p-4">
      <div className="label">{ct('acc.title')}</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[...ACCESSORIES].reverse().map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-muted"><Icon name={a.icon} size={15} className="text-warn" />{ct(`acc.${a.id}` as CKey)} <span className="text-xs text-faint num">≥ {a.min}</span></div>
        ))}
      </div>
    </Card>
  );
}

function ThreadView({ peer, onBack }: { peer: Member; onBack: () => void }) {
  const { ct, ago } = useCT();
  const c = useCommunity();
  const nav = useNav();
  const reduce = useReducedMotion();
  const setDocs = useVybe((s) => s.setCommunityDocs);
  const { lines, streak } = useThread(peer);
  const texts = useTexts(peer, lines.map((l) => l.msg));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const me = c.me!;
  const allowed = canMessage(me, peer, !!c.outboxes[peer.id]?.threads[me.id]?.msgs.length);
  const keyOk = c.canEncryptWith(peer);
  const next = nextAccessory(streak);

  // Mark as read.
  const lastTheirs = [...lines].reverse().find((l) => !l.mine)?.msg.at;
  useEffect(() => {
    if (lastTheirs) setDocs((d) => ({ ...d, 'private/read': { ...((d['private/read'] as Record<string, string>) ?? {}), [peer.id]: lastTheirs } }));
  }, [lastTheirs, peer.id, setDocs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' }); }, [lines.length, reduce]);

  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    if (await c.sendMessage(peer, draft)) setDraft('');
    setBusy(false);
  };

  return (
    <Card className="flex h-[68dvh] min-h-[420px] flex-col p-0 lg:h-[calc(100dvh-12rem)]">
      <div className="flex items-center gap-3 border-b hairline p-3">
        <IconButton icon="ArrowLeft" label={ct('close')} onClick={onBack} className="lg:hidden" />
        <button onClick={() => nav.openMember(peer.id)}><MemberAvatar member={peer} people={c.people} size={38} /></button>
        <div className="min-w-0 flex-1"><MemberName member={peer} me={me} /><div className="text-[11px] text-faint">{c.backend?.mode === 'live' ? <span className="inline-flex items-center gap-1"><Icon name="Lock" size={10} />E2EE</span> : ct('demo')}</div></div>
        <StreakBadge streak={streak} size="lg" />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        <p className="mx-auto mb-3 max-w-sm rounded-xl bg-line/[0.04] px-3 py-2 text-center text-[11px] text-faint">
          <Icon name={c.backend?.mode === 'live' ? 'Lock' : 'Sparkles'} size={11} className="mr-1 inline" />{c.backend?.mode === 'live' ? ct('chat.e2ee') : ct('chat.local')}
        </p>
        {lines.map(({ msg, mine }) => {
          const t = texts[msg.id];
          return (
            <motion.div key={(mine ? 'm' : 't') + msg.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] rounded-3xl px-4 py-2 text-[15px]', mine ? 'rounded-br-lg bg-gradient-accent text-white' : 'rounded-bl-lg bg-line/[0.07]')}>
                <p className="whitespace-pre-line break-words">{t === undefined ? '…' : t === null ? <em className="opacity-70">{ct('chat.undecryptable')}</em> : t}</p>
                <span className={cn('block text-right text-[10px]', mine ? 'text-white/70' : 'text-faint')}>{ago(msg.at)}</span>
              </div>
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="border-t hairline p-3">
        <p className="mb-2 text-center text-[11px] text-faint">
          {next ? ct('chat.streakHint', { acc: ct(`acc.${next.id}` as CKey), n: next.min }) : ct('chat.streakMax')}
        </p>
        {!allowed ? <p className="text-center text-sm text-muted">{ct('chat.cannot')}</p>
          : !keyOk ? <p className="text-center text-sm text-muted">{ct('chat.noKey')}</p>
          : (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <Input id="chat-input" value={draft} maxLength={LIMITS.message} onChange={(e) => setDraft(e.target.value)} placeholder={ct('chat.ph')} aria-label={ct('chat.ph')} />
              <Button type="submit" size="icon" icon="Send" aria-label={ct('chat.send')} disabled={!draft.trim() || busy || !c.backend?.canWrite} />
            </form>
          )}
      </div>
    </Card>
  );
}

