import { Avatar } from '@/components/ui/Avatar';
import { Badge, Button } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import type { Member } from '@/community/types';
import { relation, type Relation } from '@/community/model';
import { useCT } from '@/community/i18n';
import { interestLabel } from '@/community/options';
import { cn } from '@/lib/cn';
import type { CommunityState } from '@/community/useCommunity';
import { act } from '@/community/actions';

export function MemberAvatar({ member, people, size = 44 }: { member: Member; people: CommunityState['people']; size?: number }) {
  const url = people[member.id]?.avatarUrl;
  if (url) return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-accent/30" style={{ width: size, height: size }} />;
  return <Avatar name={member.profile.nickname} size={size} />;
}

export function MemberName({ member, me }: { member: Member; me: Member | null }) {
  const { ct } = useCT();
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate font-semibold">{member.profile.nickname}</span>
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
