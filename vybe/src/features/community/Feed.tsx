import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Chip, EmptyState, IconButton, Input, Segmented } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useCommunity } from '@/community/CommunityContext';
import { useCT, type CKey } from '@/community/i18n';
import { buildFeed, relation, type FeedItem } from '@/community/model';
import { act } from '@/community/actions';
import { LIMITS, type PostKind } from '@/community/types';
import { useVybe } from '@/store/useVybe';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { achievementDef } from '@/domain/engine';
import { ClipPlayer, MemberAvatar, MemberName } from './parts';
import { useStatsSnapshot } from './ProfileEditor';
import { checkVideo } from './video';
import { useNav } from './nav';

const KINDS: PostKind[] = ['update', 'win', 'question', 'tip', 'buddy'];
export const KIND_ICON: Record<PostKind, string> = { update: 'Activity', win: 'Trophy', question: 'MessageCircle', tip: 'Lightbulb', buddy: 'Users' };

export function Feed() {
  const { ct } = useCT();
  const c = useCommunity();
  const nav = useNav();
  const { me, members, backend } = c;
  const [filter, setFilter] = useState<'all' | 'connections' | 'questions'>('all');
  const items = useMemo(() => buildFeed(members, me).filter((it) => {
    if (filter === 'connections') return it.author.id === me?.id || relation(me, it.author) === 'connected' || !!me?.following.includes(it.author.id);
    if (filter === 'questions') return it.post.kind === 'question' || it.post.kind === 'buddy';
    return true;
  }), [members, me, filter]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {me && backend?.canWrite ? <Composer /> : (
        <Card className="flex items-center justify-between gap-3 p-4 text-sm text-muted">
          {ct('feed.needProfile')}{backend?.canWrite && <Button size="sm" onClick={nav.editProfile}>{ct('create.cta')}</Button>}
        </Card>
      )}
      <Segmented label="feedfilter" value={filter} onChange={setFilter} options={[{ value: 'all', label: ct('feed.all') }, { value: 'connections', label: ct('feed.connections') }, { value: 'questions', label: ct('feed.questions') }]} />
      {items.length === 0 ? <Card><EmptyState icon="MessageCircle" title={ct('feed.empty')} text={ct('feed.emptyText')} /></Card> : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>{items.map((it) => <PostCard key={it.key} item={it} />)}</AnimatePresence>
        </ul>
      )}
    </div>
  );
}

/** Post composer. With `clip`, a video is required (the Clips tab). */
export function Composer({ clip, onDone }: { clip?: boolean; onDone?: () => void }) {
  const { ct } = useCT();
  const c = useCommunity();
  const toast = useVybe((s) => s.toast);
  const lastAchievement = useVybe((s) => s.achievements[s.achievements.length - 1]);
  const lang = useVybe((s) => s.settings.lang);
  const stats = useStatsSnapshot();
  const [text, setText] = useState('');
  const [kind, setKind] = useState<PostKind>('update');
  const [attachType, setAttachType] = useState<'none' | 'level' | 'streak' | 'achievement'>('none');
  const [video, setVideo] = useState<{ file: File; duration: number; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const achTitle = lastAchievement ? achievementDef(lastAchievement.id)?.title[lang] : undefined;

  const pick = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const r = await checkVideo(file);
    if (!r.ok) return setError(r.reason === 'tooLong' ? ct('clip.tooLong', { s: r.seconds ?? 0 }) : r.reason === 'tooBig' ? ct('clip.tooBig') : ct('clip.bad'));
    if (video) URL.revokeObjectURL(video.preview);
    setVideo({ file, duration: r.duration, preview: URL.createObjectURL(file) });
  };

  const submit = async () => {
    const t = text.trim();
    if ((!t && !video) || t.length > LIMITS.post) return setError(ct('feed.err.length'));
    if (clip && !video) return setError(ct('clip.emptyText'));
    setBusy(true);
    let videoRef: { src: string; duration: number } | null = null;
    if (video) {
      try {
        toast(ct('clip.uploading'), 'info');
        videoRef = { src: await c.backend!.uploadVideo(video.file), duration: Math.round(video.duration * 10) / 10 };
      } catch {
        setBusy(false);
        return setError(ct('clip.uploadFail'));
      }
    }
    const attach = attachType === 'level' ? { type: 'level' as const, value: String(stats?.level ?? 1) }
      : attachType === 'streak' ? { type: 'streak' as const, value: String(stats?.streak ?? 0) }
      : attachType === 'achievement' && achTitle ? { type: 'achievement' as const, value: achTitle } : null;
    const ok = await c.save(act.post({ kind, text: t, attach, video: videoRef }));
    setBusy(false);
    if (ok) {
      setText(''); setAttachType('none'); setError(null);
      if (video) URL.revokeObjectURL(video.preview);
      setVideo(null);
      toast(ct('feed.posted'));
      onDone?.();
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <textarea id={clip ? 'clip-text' : 'feed-text'} value={text} maxLength={LIMITS.post} onChange={(e) => setText(e.target.value)} placeholder={ct('feed.placeholder')} aria-label={ct('feed.placeholder')}
          className="input min-h-[72px] resize-y border-0 bg-transparent px-1 focus:shadow-none" />
        {video && (
          <div className="relative mt-2 overflow-hidden rounded-2xl bg-black">
            <video src={video.preview} className="max-h-72 w-full object-contain" muted playsInline controls />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white num">{Math.round(video.duration)} s</span>
            <IconButton icon="X" label={ct('clip.remove')} onClick={() => { URL.revokeObjectURL(video.preview); setVideo(null); }} className="absolute right-2 top-2 bg-black/60 text-white" />
          </div>
        )}
        {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
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
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {c.backend?.canUpload ? (
            <>
              <input ref={fileRef} type="file" accept="video/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} data-testid="video-input" />
              <Button type="button" size="sm" variant="secondary" icon="Video" onClick={() => fileRef.current?.click()}>{ct('clip.add')} ≤ 60 s</Button>
            </>
          ) : clip ? <span className="text-xs text-warn">{ct('clip.noUpload')}</span> : null}
          <span className="flex-1" />
          <span className="text-xs text-faint num">{text.length}/{LIMITS.post}</span>
          <Button type="submit" size="sm" icon="Send" disabled={busy || (!text.trim() && !video)}>{ct('feed.post')}</Button>
        </div>
      </form>
    </Card>
  );
}

export function PostActions({ item, dark }: { item: FeedItem; dark?: boolean }) {
  const { ct } = useCT();
  const c = useCommunity();
  const reduce = useReducedMotion();
  const canAct = !!c.me && !!c.backend?.canWrite;
  return (
    <button disabled={!canAct} onClick={() => c.save(act.toggleLike(item.key))} aria-pressed={item.likedByMe}
      className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition disabled:opacity-50', item.likedByMe ? 'text-danger' : dark ? 'text-white/85' : 'text-muted hover:bg-line/5 hover:text-fg')}>
      <motion.span animate={item.likedByMe && !reduce ? { scale: [1, 1.3, 1] } : undefined}><Icon name="Heart" size={dark ? 22 : 17} className={item.likedByMe ? 'fill-current' : ''} /></motion.span>
      <span className="num">{item.likes || ''}</span><span className="sr-only">{ct('feed.like')}</span>
    </button>
  );
}

export function Comments({ item }: { item: FeedItem }) {
  const { ct, ago } = useCT();
  const c = useCommunity();
  const [reply, setReply] = useState('');
  const canAct = !!c.me && !!c.backend?.canWrite;
  return (
    <div className="mt-2 space-y-2.5">
      {item.comments.map(({ author, comment }) => (
        <div key={author.id + comment.id} className="flex gap-2.5">
          <MemberAvatar member={author} people={c.people} size={28} />
          <div className="min-w-0 flex-1 rounded-2xl bg-line/[0.05] px-3 py-2">
            <div className="flex items-center gap-2 text-xs"><MemberName member={author} me={c.me} /><span className="text-faint">{ago(comment.at)}</span>
              {author.id === c.me?.id && canAct && <button className="ml-auto text-faint hover:text-danger" aria-label={ct('feed.delete')} onClick={() => c.save(act.deleteComment(comment.id))}><Icon name="X" size={13} /></button>}
            </div>
            <p className="mt-0.5 whitespace-pre-line text-sm">{comment.text}</p>
          </div>
        </div>
      ))}
      {canAct && (
        <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const t = reply.trim(); if (t && await c.save(act.comment(item.key, t))) setReply(''); }}>
          <Input id={`reply-${item.key}`} value={reply} maxLength={LIMITS.comment} onChange={(e) => setReply(e.target.value)} placeholder={ct('feed.commentPh')} aria-label={ct('feed.comment')} className="py-2 text-sm" />
          <Button type="submit" size="icon" icon="Send" aria-label={ct('feed.comment')} disabled={!reply.trim()} />
        </form>
      )}
    </div>
  );
}

export function PostCard({ item }: { item: FeedItem }) {
  const { ct, ago } = useCT();
  const reduce = useReducedMotion();
  const c = useCommunity();
  const nav = useNav();
  const { me, backend } = c;
  const [showComments, setShowComments] = useState(item.comments.length > 0 && item.comments.length <= 2);
  const mine = item.author.id === me?.id;
  const canAct = !!me && !!backend?.canWrite;
  const { post } = item;
  return (
    <motion.li layout={!reduce} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card rounded-3xl p-4">
      <div className="flex items-start gap-3">
        <button onClick={() => nav.openMember(item.author.id)} aria-label={item.author.profile.nickname}><MemberAvatar member={item.author} people={c.people} size={40} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button onClick={() => nav.openMember(item.author.id)} className="min-w-0"><MemberName member={item.author} me={me} /></button>
            <span className="text-xs text-faint">{ago(post.at)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={post.kind === 'win' ? 'success' : post.kind === 'question' || post.kind === 'buddy' ? 'accent' : 'default'}><Icon name={KIND_ICON[post.kind]} size={11} />{ct(`kind.${post.kind}` as CKey)}</Badge>
            {post.video && <Badge><Icon name="Video" size={11} />{Math.round(post.video.duration)} s</Badge>}
            {post.attach && <Badge tone="warn"><Icon name={post.attach.type === 'streak' ? 'Flame' : post.attach.type === 'level' ? 'Zap' : 'Trophy'} size={11} />{ct(`attach.${post.attach.type}` as CKey, { v: post.attach.value })}</Badge>}
          </div>
        </div>
        {mine && canAct && <IconButton icon="Trash2" label={ct('feed.delete')} onClick={() => c.save(act.deletePost(post.id))} className="h-8 w-8" />}
        {!mine && backend?.isModerator && backend.moderateWrite && (
          <IconButton icon="Shield" label={ct('feed.moderate')} className="h-8 w-8" onClick={() => {
            const a = item.author;
            backend.moderateWrite!('members', a.id, { ...a, id: undefined, demo: undefined, posts: a.posts.filter((p) => p.id !== post.id) } as unknown as Record<string, unknown>);
          }} />
        )}
      </div>
      {post.text && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{post.text}</p>}
      {post.video && <ClipPlayer src={post.video.src} className="mt-3 aspect-[9/12] max-h-[70vh] w-full" />}
      <div className="mt-3 flex items-center gap-1 border-t hairline pt-2">
        <PostActions item={item} />
        <button onClick={() => setShowComments(!showComments)} aria-expanded={showComments} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-muted hover:bg-line/5 hover:text-fg">
          <Icon name="MessageCircle" size={17} /><span className="num">{item.comments.length || ''}</span><span className="sr-only">{ct('feed.comments', { n: item.comments.length })}</span>
        </button>
      </div>
      {showComments && <Comments item={item} />}
    </motion.li>
  );
}
