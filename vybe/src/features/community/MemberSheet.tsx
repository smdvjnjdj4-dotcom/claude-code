import { Sheet } from '@/components/ui/Sheet';
import { Badge, Button } from '@/components/ui/primitives';
import { ATTR_ICON, Icon } from '@/components/ui/Icon';
import type { Member } from '@/community/types';
import { canMessage, followerCount, linkUrl, matchMembers, relation } from '@/community/model';
import { useCT, type CKey } from '@/community/i18n';
import { normInterest } from '@/community/options';
import { useCommunity } from '@/community/CommunityContext';
import { act } from '@/community/actions';
import { useT } from '@/lib/i18n';
import { FollowButton, Handle, InterestChip, MemberAvatar, MemberName, RelationButton } from './parts';
import { ORDER_VIEW } from './ProfileView';
import { useNav } from './nav';

export function MemberSheet({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { ct } = useCT();
  const c = useCommunity();
  const nav = useNav();
  if (!member) return <Sheet open={false} onClose={onClose} title=""><div /></Sheet>;
  const { me } = c;
  const rel = relation(me, member);
  const match = me && rel !== 'self' ? matchMembers(me.profile, member.profile) : null;
  const canAct = !!me && !!c.backend?.canWrite;
  const theyWrote = !!(me && c.outboxes[member.id]?.threads[me.id]?.msgs.length);
  const msgOk = canMessage(me, member, theyWrote);
  return (
    <Sheet open onClose={onClose} title={member.profile.nickname} footer={rel !== 'self' ? (
      <div className="flex w-full flex-wrap gap-2">
        {msgOk && <Button variant="secondary" icon="MessageCircle" onClick={() => { onClose(); nav.openChat(member.id); }}>{ct('game.message')}</Button>}
        {rel === 'connected' && <Button variant="secondary" icon="Gamepad2" aria-label={ct('game.challenge')} onClick={() => { onClose(); nav.challenge(member.id); }} />}
        <FollowButton other={member} size="md" />
        <RelationButton me={me} other={member} community={c} size="md" full />
        <div className="flex w-full justify-between">
          {rel !== 'blocked' && <Button size="sm" variant="ghost" icon="Shield" disabled={!canAct} onClick={() => { c.save(act.block(member.id)); onClose(); }}>{ct('rel.block')}</Button>}
          {rel === 'connected' && <Button size="sm" variant="ghost" disabled={!canAct} onClick={() => c.save(act.disconnect(member.id))}>{ct('rel.remove')}</Button>}
        </div>
      </div>
    ) : undefined}>
      <ProfileBody member={member} common={match ? new Set(match.common.map((x) => `${x.key}:${normInterest(x.value)}`)) : undefined} matchScore={match?.score} />
    </Sheet>
  );
}

export function ProfileBody({ member, common, matchScore }: { member: Member; common?: Set<string>; matchScore?: number }) {
  const { ct } = useCT();
  const { attr } = useT();
  const c = useCommunity();
  const p = member.profile;
  const account = c.people[member.id]?.name;
  const creator = p.accountType === 'creator';
  return (
    <div className="space-y-5 pb-2">
      <div className="flex items-center gap-4">
        <MemberAvatar member={member} people={c.people} size={72} />
        <div className="min-w-0">
          <div className="text-lg"><MemberName member={member} me={c.me} /></div>
          <Handle member={member} />
          <div className="mt-0.5 flex flex-wrap gap-x-2 text-sm text-muted">
            {p.age && p.showAge && <span>{ct('profile.years', { n: p.age })}</span>}
            {p.city && <span className="inline-flex items-center gap-1"><Icon name="Globe" size={13} />{p.city}</span>}
            {p.pronouns && <span>{p.pronouns}</span>}
          </div>
          {account && <div className="mt-0.5 text-xs text-faint">{ct('profile.account', { name: account })}</div>}
        </div>
      </div>
      {creator && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent/25 bg-accent/[0.06] p-3 text-sm">
          {p.creatorCategory && <Badge tone="accent">{ct(`ccat.${p.creatorCategory}` as CKey)}</Badge>}
          <span className="font-semibold num">{ct('followers', { n: followerCount(c.members, member.id) })}</span>
          {p.links.map((l) => (
            <a key={l.platform} href={linkUrl(l.platform, l.value)} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 rounded-full bg-line/[0.06] px-2.5 py-1 text-xs text-muted hover:text-fg">
              <Icon name="ExternalLink" size={11} />{ct(`plat.${l.platform}` as CKey)}{l.platform !== 'website' && <span className="text-faint">@{l.value}</span>}
            </a>
          ))}
        </div>
      )}
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
