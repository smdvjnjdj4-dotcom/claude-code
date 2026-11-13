import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Chip, IconButton } from '@/components/ui/primitives';
import { ATTR_ICON, Icon } from '@/components/ui/Icon';
import { useVybe, pickData } from '@/store/useVybe';
import { useT } from '@/lib/i18n';
import { uid } from '@/lib/id';
import { demoProvider } from '@/ai/demoProvider';
import { httpProvider, probe } from '@/ai/httpProvider';
import { buildContext } from '@/ai/context';
import type { ChatMessage, Mission, MissionProposal } from '@/domain/types';
import { MISSION_XP } from '@/domain/progression';
import { todayKey } from '@/lib/date';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/motion';

let liveCache: { endpoint: string; ok: boolean } | null = null;

export default function CompanionScreen() {
  const { t, attr, diff } = useT();
  const chat = useVybe((s) => s.chat);
  const endpoint = useVybe((s) => s.settings.ai.endpoint);
  const push = useVybe((s) => s.pushChat);
  const update = useVybe((s) => s.updateChat);
  const clear = useVybe((s) => s.clearChat);
  const saveMission = useVybe((s) => s.saveMission);
  const toast = useVybe((s) => s.toast);
  const reduce = useReducedMotion();
  const [live, setLive] = useState<boolean>(liveCache?.endpoint === endpoint ? liveCache.ok : false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (liveCache?.endpoint === endpoint) return;
    probe(endpoint).then((ok) => { liveCache = { endpoint, ok }; setLive(ok); });
  }, [endpoint]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' }); }, [chat.length, busy, reduce]);

  const send = async (text: string) => {
    const msg = text.trim().slice(0, 1000);
    if (!msg || busy) return;
    setInput('');
    const userMsg: ChatMessage = { id: uid('c'), role: 'user', text: msg, at: new Date().toISOString() };
    push(userMsg);
    setBusy(true);
    const state = useVybe.getState();
    const ctx = buildContext(pickData(state));
    const history = [...state.chat.map((c) => ({ role: c.role, text: c.text }))];
    let reply;
    let prefix = '';
    try {
      reply = await (live ? httpProvider(endpoint) : demoProvider).reply(history, ctx);
    } catch {
      prefix = t('ai.error') + '\n\n';
      reply = await demoProvider.reply(history, ctx);
    }
    const proposals: MissionProposal[] = reply.proposals.map((p) => ({ ...p, id: uid('p'), status: 'pending' }));
    push({ id: uid('c'), role: 'assistant', text: prefix + reply.text, at: new Date().toISOString(), mode: prefix ? 'demo' : reply.mode, proposals });
    setBusy(false);
  };

  const accept = (msg: ChatMessage, p: MissionProposal) => {
    const mission: Mission = {
      id: uid('m'), title: p.title, attribute: p.attribute, difficulty: p.difficulty, recurrence: p.recurrence,
      date: p.recurrence === 'once' ? todayKey() : undefined, target: 1, progress: {}, completed: {}, createdAt: new Date().toISOString(), source: 'ai',
    };
    saveMission(mission);
    update(msg.id, { proposals: msg.proposals?.map((x) => (x.id === p.id ? { ...x, status: 'accepted' } : x)) });
    toast(t('m.saved'));
  };
  const dismiss = (msg: ChatMessage, p: MissionProposal) => update(msg.id, { proposals: msg.proposals?.map((x) => (x.id === p.id ? { ...x, status: 'dismissed' } : x)) });

  const suggestions = [t('ai.s.plan'), t('ai.s.break'), t('ai.s.reflect'), t('ai.s.focus')];

  return (
    <Page>
      <PageHeader
        title={<span className="flex items-center gap-3">{t('ai.title')} {live ? <Badge tone="success">{t('ai.live')}</Badge> : <Badge tone="warn">{t('ai.demoMode')}</Badge>}</span>}
        actions={chat.length > 0 && <IconButton icon="Trash2" label={t('ai.clear')} onClick={clear} />}
      />
      {!live && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-warn/25 bg-warn/[0.07] p-3.5 text-xs text-muted">
          <Icon name="Bot" size={16} className="mt-px shrink-0 text-warn" />{t('ai.demoExplain')}
        </div>
      )}

      <div className="flex min-h-[50dvh] flex-col">
        {chat.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <motion.div animate={reduce ? undefined : { scale: [1, 1.06, 1] }} transition={{ duration: 4, repeat: Infinity }} className="relative mb-5 grid h-20 w-20 place-items-center rounded-[26px] bg-gradient-accent text-white shadow-glow">
              <Icon name="Sparkles" size={34} />
            </motion.div>
            <h2 className="font-display text-xl font-semibold">{t('ai.empty')}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted">{t('ai.emptyText')}</p>
          </div>
        ) : (
          <ul className="flex-1 space-y-4 pb-4" aria-live="polite">
            <AnimatePresence initial={false}>
              {chat.map((m) => (
                <motion.li key={m.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[88%] sm:max-w-[75%]', m.role === 'user' ? '' : 'w-full')}>
                    <div className={cn('whitespace-pre-line rounded-3xl px-4 py-3 text-[15px] leading-relaxed', m.role === 'user' ? 'rounded-br-lg bg-gradient-accent text-white' : 'card rounded-bl-lg')}>
                      {m.text}
                    </div>
                    {m.role === 'assistant' && m.mode && <span className="ml-2 mt-1 inline-block text-[10px] uppercase tracking-wider text-faint">{m.mode === 'demo' ? t('ai.demoMode') : t('ai.live')}</span>}
                    {m.proposals && m.proposals.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {m.proposals.map((p) => (
                          <div key={p.id} className={cn('card flex flex-wrap items-center gap-3 rounded-2xl p-3', p.status !== 'pending' && 'opacity-60')}>
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><Icon name={ATTR_ICON[p.attribute]} size={17} /></span>
                            <div className="min-w-[160px] flex-1">
                              <div className="text-[11px] uppercase tracking-wider text-faint">{t('ai.proposal')}</div>
                              <div className="text-sm font-medium">{p.title}</div>
                              <div className="text-xs text-muted">{attr(p.attribute)} · {diff(p.difficulty)} · +{MISSION_XP[p.difficulty]} XP</div>
                            </div>
                            {p.status === 'pending' ? (
                              <div className="ml-auto flex gap-1">
                                <IconButton icon="X" label={t('ai.dismiss')} onClick={() => dismiss(m, p)} />
                                <Button size="sm" icon="Check" onClick={() => accept(m, p)}>{t('ai.accept')}</Button>
                              </div>
                            ) : (
                              <Badge tone={p.status === 'accepted' ? 'success' : 'default'}>{p.status === 'accepted' ? t('ai.accepted') : t('ai.dismissed')}</Badge>
                            )}
                          </div>
                        ))}
                        {m.proposals.some((p) => p.status === 'pending') && <p className="ml-1 text-[11px] text-faint">{t('ai.confirmNote')}</p>}
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
            {busy && (
              <li className="flex items-center gap-2 text-sm text-muted" aria-label={t('ai.thinking')}>
                <span className="card flex gap-1 rounded-3xl px-4 py-3">
                  {[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-accent" animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />)}
                </span>
              </li>
            )}
          </ul>
        )}
        <div ref={endRef} />

        <div className="sticky bottom-20 mt-2 space-y-3 lg:bottom-6">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {suggestions.map((s) => <Chip key={s} onClick={() => send(s)} className="shrink-0">{s}</Chip>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="glass flex items-center gap-2 rounded-3xl p-2 shadow-card">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} placeholder={t('ai.placeholder')} aria-label={t('ai.placeholder')} className="flex-1 bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-faint" />
            <Button type="submit" size="icon" icon="Send" aria-label={t('ai.send')} disabled={!input.trim() || busy} />
          </form>
        </div>
      </div>
    </Page>
  );
}
