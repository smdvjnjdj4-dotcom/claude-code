import { Sheet } from '@/components/ui/Sheet';
import { Badge, Button } from '@/components/ui/primitives';
import { ATTR_ICON, Icon } from '@/components/ui/Icon';
import type { Member } from '@/community/types';
import { matchMembers, relation } from '@/community/model';
import { useCT, type CKey } from '@/community/i18n';
import { normInterest } from '@/community/options';
import type { CommunityState } from '@/community/useCommunity';
import { act } from '@/community/actions';
import { useT } from '@/lib/i18n';
import { InterestChip, MemberAvatar, MemberName, RelationButton } from './parts';
import { ORDER_VIEW } from './ProfileView';

export function MemberSheet({ member, community, onClose }: { member: Member | null; community: CommunityState; onClose: () => void }) {
  const { ct } = useCT();
  if (!member) return <Sheet open={false} onClose={onClose} title=""><div /></Sheet>;
  const { me } = community;
  const rel = relation(me, member);
  const match = me && rel !== 'self' ? matchMembers(me.profile, member.profile) : null;
  const canAct = !!me && !!community.backend?.canWrite;
  return (
    <Sheet open onClose={onClose} title={member.profile.nickname} footer={rel !== 'self' ? <>
      {rel !== 'blocked' && <Button variant="ghost" icon="Shield" disabled={!canAct} onClick={() => { community.save(act.block(member.id)); onClose(); }}>{ct('rel.block')}</Button>}
      {rel === 'connected' && <Button variant="ghost" disabled={!canAct} onClick={() => community.save(act.disconnect(member.id))}>{ct('rel.remove')}</Button>}
      <RelationButton me={me} other={member} community={community} size="md" full />
    </> : undefined}>
      <ProfileBody member={member} community={community} common={match ? new Set(match.common.map((c) => `${c.key}:${normInterest(c.value)}`)) : undefined} matchScore={match?.score} />
    </Sheet>
  );
}

export function ProfileBody({ member, community, common, matchScore }: { member: Member; community: CommunityState; common?: Set<string>; matchScore?: number }) {
  const { ct } = useCT();
  const { attr } = useT();
  const p = member.profile;
  const account = community.people[member.id]?.name;
  return (
    <div className="space-y-5 pb-2">
      <div className="flex items-center gap-4">
        <MemberAvatar member={member} people={community.people} size={72} />
        <div className="min-w-0">
          <div className="text-lg"><MemberName member={member} me={community.me} /></div>
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-muted">
            {p.age && p.showAge && <span>{ct('profile.years', { n: p.age })}</span>}
            {p.city && <span className="inline-flex items-center gap-1"><Icon name="Globe" size={13} />{p.city}</span>}
            {p.pronouns && <span>{p.pronouns}</span>}
          </div>
          {account && <div className="mt-0.5 text-xs text-faint">{ct('profile.account', { name: account })}</div>}
        </div>
      </div>
      {(p.stats || matchScore !== undefined) && (
        <div className="flex flex-wrap gap-2">
          {matchScore !== undefined && <Badge tone="accent">{ct('disc.match')} {matchScore}%</Badge>}
          {p.stats && <>
            <Badge>{ct('profile.level', { n: p.stats.level })}</Badge>
            <Badge tone="warn"><Icon name="Flame" size={11} />{ct('profile.streak', { n: p.stats.streak })}</Badge>
            <Badge><Icon name={ATTR_ICON[p.stats.topAttribute]} size={11} />{attr(p.stats.topAttribute)}</Badge>
          </>}
        </div>
      )}
      {p.bio && <p className="whitespace-pre-line text-[15px] leading-relaxed">{p.bio}</p>}
      {ORDER_VIEW.filter((k) => p.interests[k].length).map((k) => (
        <div key={k}>
          <div className="label">{ct(`cat.${k}` as CKey)}</div>
          <div className="flex flex-wrap gap-1.5">
            {p.interests[k].map((v) => <InterestChip key={v} value={v} common={common?.has(`${k}:${normInterest(v)}`)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
