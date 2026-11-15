import { Avatar } from '@/components/ui/Avatar';
import { Badge, Button } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import type { Member } from '@/community/types';
import { relation, type Relation } from '@/community/model';
import { useCT } from '@/community/i18n';
import { interestLabel } from '@/community/options';
import { cn } from '@/lib/cn';
import { useCommunity, type CommunityState } from '@/community/CommunityContext';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/motion';
import { act } from '@/community/actions';

export function MemberAvatar({ member, people, size = 44 }: { member: Member; people: CommunityState['people']; size?: number }) {
  const url = people[member.id]?.avatarUrl;
  if (url) return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-accent/30" style={{ width: size, height: size }} />;
  return <Avatar name={member.profile.nickname} size={size} />;
}

export function MemberName({ member, me }: { member: Member; me: Member | null }) {
  const { ct } = useCT();
  return (
    <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <span className="truncate font-semibold">{member.profile.nickname}</span>
      {member.profile.accountType === 'creator' && <CreatorBadge />}
      {member.id === me?.id && <Badge tone="accent">{ct('feed.you')}</Badge>}
      {member.demo && <Badge tone="warn">{ct('demo')}</Badge>}
    </span>
  );
}

export function InterestChip({ value, common, className }: { value: string; common?: boolean; className?: string }) {
  const { lang } = useCT();
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs', common ? 'border-accent/40 bg-accent/12 text-fg' : 'hairline bg-line/[0.04] text-muted', className)} style={common ? { background: 'rgb(var(--accent) / 0.12)' } : undefined}>
      {common && <Icon name="Sparkles" size={11} className="text-accent" />}
      {interestLabel(value, lang)}
    </span>
  );
}

/** The one relationship button, reflecting the current state between the viewer and another member. */
export function RelationButton({ me, other, community, size = 'sm', full }: { me: Member | null; other: Member; community: CommunityState; size?: 'sm' | 'md'; full?: boolean }) {
  const { ct } = useCT();
  const rel: Relation = relation(me, other);
  const canAct = !!me && !!community.backend?.canWrite;
  const cls = full ? 'flex-1' : undefined;
  if (rel === 'self') return null;
  if (rel === 'blocked') return <Button size={size} variant="ghost" className={cls} disabled={!canAct || !me?.blocked.includes(other.id)} onClick={() => community.save(act.unblock(other.id))}>{ct('rel.unblock')}</Button>;
  if (rel === 'connected') return <Button size={size} variant="secondary" icon="Check" className={cls} disabled>{ct('rel.connected')}</Button>;
  if (rel === 'requested') return <Button size={size} variant="secondary" className={cls} disabled={!canAct} onClick={() => community.save(act.disconnect(other.id))} title={ct('rel.withdraw')}>{ct('rel.requested')}</Button>;
  if (rel === 'incoming') return (
    <span className={cn('flex shrink-0 gap-2', cls)}>
      <Button size={size} variant="ghost" disabled={!canAct} onClick={() => community.save(act.decline(other.id))}>{ct('rel.decline')}</Button>
      <Button size={size} icon="Check" disabled={!canAct} onClick={() => community.save(act.connect(other.id))}>{ct('rel.accept')}</Button>
    </span>
  );
  return <Button size={size} icon="Plus" className={cls} disabled={!canAct} onClick={() => community.save(act.connect(other.id))}>{ct('rel.connect')}</Button>;
}

export function CreatorBadge() {
  const { ct } = useCT();
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" title={ct('edit.creatorHint')}>
      <Icon name="Star" size={10} strokeWidth={2.5} />{ct('creator')}
    </span>
  );
}

export function Handle({ member }: { member: Member }) {
  return member.profile.handle ? <span className="text-xs text-faint">@{member.profile.handle}</span> : null;
}

/** One-sided follow for creator profiles. */
export function FollowButton({ other, size = 'sm', full }: { other: Member; size?: 'sm' | 'md'; full?: boolean }) {
  const { ct } = useCT();
  const c = useCommunity();
  if (other.profile.accountType !== 'creator' || !c.me || c.me.id === other.id) return null;
  const on = c.me.following.includes(other.id);
  return (
    <Button size={size} variant={on ? 'secondary' : 'primary'} icon={on ? 'Check' : 'Star'} className={full ? 'flex-1' : undefined} disabled={!c.backend?.canWrite}
      onClick={() => c.save(on ? act.unfollow(other.id) : act.follow(other.id))}>
      {on ? ct('following') : ct('follow')}
    </Button>
  );
}

/** Resolves a clip source to a playable URL (asset in the shared link, IndexedDB blob locally). */
export function useVideoUrl(src: string | undefined) {
  const { backend } = useCommunity();
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!src || !backend) return;
    let alive = true;
    backend.videoUrl(src).then((u) => alive && setUrl(u)).catch(() => alive && setUrl(null));
    return () => { alive = false; };
  }, [src, backend]);
  return url;
}

/** Muted autoplay while at least 60 % visible; tap toggles sound. */
export function ClipPlayer({ src, className, rounded = true }: { src: string; className?: string; rounded?: boolean }) {
  const { ct } = useCT();
  const url = useVideoUrl(src);
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const v = ref.current;
    if (!v || !url) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.6 && !reduce) v.play().catch(() => undefined);
      else v.pause();
    }, { threshold: [0, 0.6, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, [url, reduce]);
  if (url === null) return <div className={cn('grid place-items-center bg-line/5 text-sm text-faint', rounded && 'rounded-2xl', className)}><span className="flex items-center gap-2"><Icon name="Camera" size={16} />{ct('clip.unavailable')}</span></div>;
  return (
    <div className={cn('relative overflow-hidden bg-black', rounded && 'rounded-2xl', className)}>
      {url && <video ref={ref} src={url} muted={muted} loop playsInline preload="metadata" controls={reduce} className="h-full w-full object-cover" onClick={() => setMuted(!muted)} />}
      {url && !reduce && (
        <button onClick={() => setMuted(!muted)} className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur" aria-label={ct('clip.tapSound')}>
          <Icon name={muted ? 'VolumeX' : 'Volume2'} size={13} />{muted ? ct('clip.tapSound') : ''}
        </button>
      )}
    </div>
  );
}
