import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Card, Chip, EmptyState, IconButton, Input, Segmented, SectionHeader, Skeleton } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useCommunity, type CommunityState } from '@/community/useCommunity';
import { useCT, type CKey } from '@/community/i18n';
import { buildFeed, matchMembers, relation, type FeedItem } from '@/community/model';
import { interestLabel, OPTIONS } from '@/community/options';
import { act } from '@/community/actions';
import { LIMITS, type Member, type PostKind } from '@/community/types';
import { useVybe } from '@/store/useVybe';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { InterestChip, MemberAvatar, MemberName, RelationButton } from './parts';
import { MemberSheet, ProfileBody } from './MemberSheet';
import { ProfileEditor, useStatsSnapshot } from './ProfileEditor';
import { achievementDef } from '@/domain/engine';

type Tab = 'discover' | 'feed' | 'connections' | 'profile';

export default function CommunityScreen() {
  const { ct } = useCT();
  const community = useCommunity();
  const { backend, status, me } = community;
  const [tab, setTab] = useState<Tab>('discover');
  const [editor, setEditor] = useState(false);
  const [open, setOpen] = useState<Member | null>(null);
  const incoming = useMemo(() => community.members.filter((m) => relation(me, m) === 'incoming').length, [community.members, me]);
  const openMember = open ? community.members.find((m) => m.id === open.id) ?? open : null;

  return (
    <Page>
      <PageHeader title={ct('title')} subtitle={ct('sub')} actions={me && <Button variant="secondary" icon="Pencil" aria-label={ct('edit')} onClick={() => setEditor(true)}><span className="hidden sm:inline">{ct('edit')}</span></Button>} />
      {backend && (
        <div className={cn('mb-4 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs', backend.mode === 'live' ? 'border-success/25 bg-success/[0.06]' : 'border-warn/25 bg-warn/[0.06]')}>
          <Badge tone={backend.mode === 'live' ? 'success' : 'warn'}>{backend.mode === 'live' ? ct('mode.live') : ct('mode.local')}</Badge>
          <span className="text-muted">{backend.mode === 'live' ? (backend.canWrite ? ct('mode.liveText') : ct('mode.readOnly')) : ct('mode.localText')}</span>
        </div>
      )}
      {status === 'stale' && <p className="mb-4 rounded-xl bg-warn/10 px-3.5 py-2.5 text-sm text-warn">{ct('status.stale')}</p>}
      {status === 'error' && <p className="mb-4 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{ct('status.error')}</p>}

      {!backend || (status === 'loading' && community.members.length === 0) ? (
        <div className="space-y-3" aria-label={ct('status.loading')}><Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : (
        <>
          {!me && backend.canWrite && (
            <Card className="glow-border mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-accent text-white shadow-glow"><Icon name="Users" size={22} /></span>
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold">{ct('create.title')}</h2>
                <p className="text-sm text-muted">{ct('create.text')}</p>
              </div>
              <Button icon="Sparkles" onClick={() => setEditor(true)}>{ct('create.cta')}</Button>
            </Card>
          )}
          <div className="mb-5">
            <Segmented label="community" value={tab} onChange={setTab} className="[&_button]:px-1.5 [&_button]:text-[13px] sm:[&_button]:px-3 sm:[&_button]:text-sm" options={[
              { value: 'discover', label: ct('tab.discover') },
              { value: 'feed', label: ct('tab.feed') },
              { value: 'connections', label: <span className="inline-flex items-center gap-1.5">{ct('tab.connections')}{incoming > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-white num">{incoming}</span>}</span> },
              { value: 'profile', label: ct('tab.profile') },
            ]} />
          </div>
          {tab === 'discover' && <Discover community={community} onOpen={setOpen} />}
          {tab === 'feed' && <Feed community={community} onOpen={setOpen} onCreate={() => setEditor(true)} />}
          {tab === 'connections' && <Connections community={community} onOpen={setOpen} />}
          {tab === 'profile' && (me
            ? <Card><p className="mb-4 text-xs uppercase tracking-wider text-faint">{ct('profile.preview')}</p><ProfileBody member={me} community={community} /><Button className="mt-5" variant="secondary" icon="Pencil" onClick={() => setEditor(true)}>{ct('edit')}</Button></Card>
            : <Card><EmptyState icon="User" title={ct('create.title')} text={ct('create.text')} action={backend.canWrite ? <Button icon="Sparkles" onClick={() => setEditor(true)}>{ct('create.cta')}</Button> : undefined} /></Card>)}
        </>
      )}
      <ProfileEditor open={editor} onClose={() => setEditor(false)} community={community} />
      <MemberSheet member={openMember} community={community} onClose={() => setOpen(null)} />
    </Page>
  );
}

// ---------------------------------------------------------------- discover

function Discover({ community, onOpen }: { community: CommunityState; onOpen: (m: Member) => void }) {
  const { ct, lang } = useCT();
  const reduce = useReducedMotion();
  const { me, members, backend } = community;
  const [q, setQ] = useState('');
  const [lookingFor, setLookingFor] = useState<string | null>(null);
  const [ageBand, setAgeBand] = useState<'all' | '16-20' | '21-25' | '26-30' | '31-40' | '41+'>('all');

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return members
      .filter((m) => { const r = relation(me, m); return r !== 'self' && r !== 'blocked' && (m.profile.discoverable || r === 'connected'); })
      .map((m) => ({ m, match: me ? matchMembers(me.profile, m.profile) : { score: 0, common: [] } }))
      .filter(({ m }) => {
        if (lookingFor && !m.profile.interests.lookingFor.includes(lookingFor)) return false;
        if (ageBand !== 'all') {
          const a = m.profile.age;
          if (!a) return false;
          const [lo, hi] = ageBand === '41+' ? [41, 99] : ageBand.split('-').map(Number);
          if (a < lo || a > hi) return false;
        }
        if (!query) return true;
        const hay = [m.profile.nickname, m.profile.city, m.profile.bio, ...Object.values(m.profile.interests).flat().map((v) => interestLabel(v, lang))].join(' ').toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => b.match.score - a.match.score || b.m.profile.updatedAt.localeCompare(a.m.profile.updatedAt));
  }, [members, me, q, lookingFor, ageBand, lang]);

  const filtered = q || lookingFor || ageBand !== 'all';
  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Icon name="Target" size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <Input id="disc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={ct('disc.search')} aria-label={ct('disc.search')} className="pl-11" />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <span className="self-center text-xs text-faint">{ct('disc.lookingFor')}</span>
          {(OPTIONS.lookingFor ?? []).map(([id]) => <Chip key={id} selected={lookingFor === id} onClick={() => setLookingFor(lookingFor === id ? null : id)} className="shrink-0 py-1.5 text-[13px]">{interestLabel(id, lang)}</Chip>)}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <span className="self-center text-xs text-faint">{ct('disc.age')}</span>
          {(['all', '16-20', '21-25', '26-30', '31-40', '41+'] as const).map((b) => <Chip key={b} selected={ageBand === b} onClick={() => setAgeBand(b)} className="shrink-0 py-1.5 text-[13px]">{b === 'all' ? ct('disc.any') : b}</Chip>)}
        </div>
      </div>
      {list.length === 0 ? (
        <Card><EmptyState icon="Users" title={ct('disc.empty')} text={filtered ? ct('disc.emptyFilter') : backend?.mode === 'live' ? ct('disc.emptyLive') : ct('disc.emptyFilter')} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map(({ m, match }, i) => (
            <motion.div key={m.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="card flex flex-col rounded-3xl p-5">
              <button className="flex items-center gap-3 text-left" onClick={() => onOpen(m)}>
                <MemberAvatar member={m} people={community.people} size={52} />
                <div className="min-w-0 flex-1">
                  <MemberName member={m} me={me} />
                  <div className="truncate text-xs text-muted">{[m.profile.age && m.profile.showAge ? ct('profile.years', { n: m.profile.age }) : '', m.profile.city, m.profile.stats ? ct('profile.level', { n: m.profile.stats.level }) : ''].filter(Boolean).join(' · ')}</div>
                </div>
                {me && <MatchRing score={match.score} />}
              </button>
              {m.profile.bio && <p className="mt-3 line-clamp-2 text-sm text-muted">{m.profile.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {match.common.length > 0
                  ? match.common.slice(0, 6).map((c) => <InterestChip key={c.key + c.value} value={c.value} common />)
                  : [...m.profile.interests.lookingFor, ...m.profile.interests.musicGenres, ...m.profile.interests.hobbies].slice(0, 5).map((v) => <InterestChip key={v} value={v} />)}
                {match.common.length > 6 && <span className="self-center text-xs text-faint">+{match.common.length - 6}</span>}
              </div>
              <div className="mt-4 flex items-center gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => onOpen(m)}>{ct('tab.profile')}</Button>
                <span className="flex-1" />
                <RelationButton me={me} other={m} community={community} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchRing({ score }: { score: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-12 w-12 shrink-0 place-items-center" aria-label={`Match ${score}%`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--line))" strokeOpacity="0.1" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="text-[11px] font-bold num">{score}%</span>
    </div>
  );
}

// ---------------------------------------------------------------- feed

const KINDS: PostKind[] = ['update', 'win', 'question', 'tip', 'buddy'];
const KIND_ICON: Record<PostKind, string> = { update: 'Activity', win: 'Trophy', question: 'MessageCircle', tip: 'Lightbulb', buddy: 'Users' };

function Feed({ community, onOpen, onCreate }: { community: CommunityState; onOpen: (m: Member) => void; onCreate: () => void }) {
  const { ct } = useCT();
  const { me, members, backend } = community;
  const [filter, setFilter] = useState<'all' | 'connections' | 'questions'>('all');
  const items = useMemo(() => buildFeed(members, me).filter((it) => {
    if (filter === 'connections') return it.author.id === me?.id || relation(me, it.author) === 'connected';
    if (filter === 'questions') return it.post.kind === 'question' || it.post.kind === 'buddy';
    return true;
  }), [members, me, filter]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {me && backend?.canWrite ? <Composer community={community} /> : (
        <Card className="flex items-center justify-between gap-3 p-4 text-sm text-muted">
          {ct('feed.needProfile')}{backend?.canWrite && <Button size="sm" onClick={onCreate}>{ct('create.cta')}</Button>}
        </Card>
      )}
      <Segmented label="feedfilter" value={filter} onChange={setFilter} options={[{ value: 'all', label: ct('feed.all') }, { value: 'connections', label: ct('feed.connections') }, { value: 'questions', label: ct('feed.questions') }]} />
      {items.length === 0 ? <Card><EmptyState icon="MessageCircle" title={ct('feed.empty')} text={ct('feed.emptyText')} /></Card> : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>{items.map((it) => <PostCard key={it.key} item={it} community={community} onOpen={onOpen} />)}</AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function Composer({ community }: { community: CommunityState }) {
  const { ct } = useCT();
  const toast = useVybe((s) => s.toast);
  const lastAchievement = useVybe((s) => s.achievements[s.achievements.length - 1]);
  const lang = useVybe((s) => s.settings.lang);
  const stats = useStatsSnapshot();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<PostKind>('update');
  const [attachType, setAttachType] = useState<'none' | 'level' | 'streak' | 'achievement'>('none');
  const [error, setError] = useState<string | null>(null);
  const achTitle = lastAchievement ? achievementDef(lastAchievement.id)?.title[lang] : undefined;
  const submit = async () => {
    const t = text.trim();
    if (!t || t.length > LIMITS.post) return setError(ct('feed.err.length'));
    const attach = attachType === 'level' ? { type: 'level' as const, value: String(stats?.level ?? 1) }
      : attachType === 'streak' ? { type: 'streak' as const, value: String(stats?.streak ?? 0) }
      : attachType === 'achievement' && achTitle ? { type: 'achievement' as const, value: achTitle } : null;
    if (await community.save(act.post({ kind, text: t, attach }))) { setText(''); setAttachType('none'); setError(null); toast(ct('feed.posted')); }
  };
  return (
    <Card className="p-4">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <textarea id="feed-text" value={text} maxLength={LIMITS.post} onChange={(e) => setText(e.target.value)} placeholder={ct('feed.placeholder')} aria-label={ct('feed.placeholder')}
          className="input min-h-[84px] resize-y border-0 bg-transparent px-1 focus:shadow-none" />
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {KINDS.map((k) => <Chip key={k} icon={KIND_ICON[k]} selected={kind === k} onClick={() => setKind(k)} className="py-1 text-xs">{ct(`kind.${k}` as CKey)}</Chip>)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t hairline pt-3">
          <span className="text-xs text-faint">{ct('feed.attach')}:</span>
          {(['none', 'level', 'streak', ...(achTitle ? ['achievement'] : [])] as const).map((a) => (
            <Chip key={a} selected={attachType === a} onClick={() => setAttachType(a as typeof attachType)} className="py-1 text-xs">
              {a === 'none' ? '–' : a === 'level' ? ct('attach.level', { v: stats?.level ?? 1 }) : a === 'streak' ? ct('attach.streak', { v: stats?.streak ?? 0 }) : ct('attach.achievement', { v: achTitle ?? '' })}
            </Chip>
          ))}
          <span className="flex-1" />
          <span className="text-xs text-faint num">{text.length}/{LIMITS.post}</span>
          <Button type="submit" size="sm" icon="Send" disabled={!text.trim()}>{ct('feed.post')}</Button>
        </div>
      </form>
    </Card>
  );
}

function PostCard({ item, community, onOpen }: { item: FeedItem; community: CommunityState; onOpen: (m: Member) => void }) {
  const { ct, ago } = useCT();
  const reduce = useReducedMotion();
  const { me, backend } = community;
  const [showComments, setShowComments] = useState(item.comments.length > 0 && item.comments.length <= 2);
  const [reply, setReply] = useState('');
  const mine = item.author.id === me?.id;
  const canAct = !!me && !!backend?.canWrite;
  const { post } = item;
  return (
    <motion.li layout={!reduce} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card rounded-3xl p-4">
      <div className="flex items-start gap-3">
        <button onClick={() => onOpen(item.author)} aria-label={item.author.profile.nickname}><MemberAvatar member={item.author} people={community.people} size={40} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button onClick={() => onOpen(item.author)} className="min-w-0"><MemberName member={item.author} me={me} /></button>
            <span className="text-xs text-faint">{ago(post.at)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={post.kind === 'win' ? 'success' : post.kind === 'question' || post.kind === 'buddy' ? 'accent' : 'default'}><Icon name={KIND_ICON[post.kind]} size={11} />{ct(`kind.${post.kind}` as CKey)}</Badge>
            {post.attach && <Badge tone="warn"><Icon name={post.attach.type === 'streak' ? 'Flame' : post.attach.type === 'level' ? 'Zap' : 'Trophy'} size={11} />{ct(`attach.${post.attach.type}` as CKey, { v: post.attach.value })}</Badge>}
          </div>
        </div>
        {mine && canAct && <IconButton icon="Trash2" label={ct('feed.delete')} onClick={() => community.save(act.deletePost(post.id))} className="h-8 w-8" />}
        {!mine && backend?.isModerator && backend.moderateRemovePost && <IconButton icon="Shield" label={ct('feed.moderate')} onClick={() => backend.moderateRemovePost!(item.author, post.id)} className="h-8 w-8" />}
      </div>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{post.text}</p>
      <div className="mt-3 flex items-center gap-1 border-t hairline pt-2">
        <button disabled={!canAct} onClick={() => community.save(act.toggleLike(item.key))} aria-pressed={item.likedByMe}
          className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition disabled:opacity-50', item.likedByMe ? 'text-danger' : 'text-muted hover:bg-line/5 hover:text-fg')}>
          <motion.span animate={item.likedByMe && !reduce ? { scale: [1, 1.3, 1] } : undefined}><Icon name="Heart" size={17} className={item.likedByMe ? 'fill-current' : ''} /></motion.span>
          <span className="num">{item.likes || ''}</span><span className="sr-only">{ct('feed.like')}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} aria-expanded={showComments} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-muted hover:bg-line/5 hover:text-fg">
          <Icon name="MessageCircle" size={17} /><span className="num">{item.comments.length || ''}</span><span className="sr-only">{ct('feed.comments', { n: item.comments.length })}</span>
        </button>
      </div>
      {showComments && (
        <div className="mt-2 space-y-2.5">
          {item.comments.map(({ author, comment }) => (
            <div key={author.id + comment.id} className="flex gap-2.5">
              <MemberAvatar member={author} people={community.people} size={28} />
              <div className="min-w-0 flex-1 rounded-2xl bg-line/[0.05] px-3 py-2">
                <div className="flex items-center gap-2 text-xs"><MemberName member={author} me={me} /><span className="text-faint">{ago(comment.at)}</span>
                  {author.id === me?.id && canAct && <button className="ml-auto text-faint hover:text-danger" aria-label={ct('feed.delete')} onClick={() => community.save(act.deleteComment(comment.id))}><Icon name="X" size={13} /></button>}
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm">{comment.text}</p>
              </div>
            </div>
          ))}
          {canAct && (
            <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const t = reply.trim(); if (t && await community.save(act.comment(item.key, t))) setReply(''); }}>
              <Input id={`reply-${item.key}`} value={reply} maxLength={LIMITS.comment} onChange={(e) => setReply(e.target.value)} placeholder={ct('feed.commentPh')} aria-label={ct('feed.comment')} className="py-2 text-sm" />
              <Button type="submit" size="icon" icon="Send" aria-label={ct('feed.comment')} disabled={!reply.trim()} />
            </form>
          )}
        </div>
      )}
    </motion.li>
  );
}

// ---------------------------------------------------------------- connections

function Connections({ community, onOpen }: { community: CommunityState; onOpen: (m: Member) => void }) {
  const { ct } = useCT();
  const { me, members } = community;
  const groups = useMemo(() => {
    const by = (r: string) => members.filter((m) => relation(me, m) === r);
    return { incoming: by('incoming'), connected: by('connected'), sent: by('requested'), blocked: members.filter((m) => me?.blocked.includes(m.id)) };
  }, [members, me]);
  const Row = ({ m }: { m: Member }) => (
    <div className="flex flex-wrap items-center gap-3 px-3 py-3">
      <button onClick={() => onOpen(m)}><MemberAvatar member={m} people={community.people} size={44} /></button>
      <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(m)}>
        <MemberName member={m} me={me} />
        {me && <div className="text-xs text-muted">{ct('disc.match')} {matchMembers(me.profile, m.profile).score}%</div>}
      </button>
      <span className="ml-auto"><RelationButton me={me} other={m} community={community} /></span>
    </div>
  );
  const sections: [CKey, Member[]][] = [['conn.incoming', groups.incoming], ['conn.connected', groups.connected], ['conn.sent', groups.sent], ['conn.blocked', groups.blocked]];
  if (!groups.incoming.length && !groups.connected.length && !groups.sent.length && !groups.blocked.length) return <Card><EmptyState icon="Users" title={ct('tab.connections')} text={ct('conn.none')} /></Card>;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {sections.filter(([, l]) => l.length).map(([k, l]) => (
        <section key={k}>
          <SectionHeader title={<span>{ct(k)} <span className="text-sm font-normal text-muted num">{l.length}</span></span>} />
          <Card className="divide-y divide-line/5 p-1">{l.map((m) => <Row key={m.id} m={m} />)}</Card>
        </section>
      ))}
    </div>
  );
}
