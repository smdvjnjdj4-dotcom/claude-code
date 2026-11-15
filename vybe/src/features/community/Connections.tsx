import { useMemo } from 'react';
import { Card, EmptyState, IconButton, SectionHeader } from '@/components/ui/primitives';
import { useCommunity } from '@/community/CommunityContext';
import { useCT, type CKey } from '@/community/i18n';
import { matchMembers, relation } from '@/community/model';
import type { Member } from '@/community/types';
import { MemberAvatar, MemberName, RelationButton } from './parts';
import { useNav } from './nav';

export function Connections() {
  const { ct } = useCT();
  const c = useCommunity();
  const nav = useNav();
  const { me, members } = c;
  const groups = useMemo(() => {
    const by = (r: string) => members.filter((m) => relation(me, m) === r);
    return {
      incoming: by('incoming'), connected: by('connected'), sent: by('requested'),
      following: members.filter((m) => me?.following.includes(m.id) && m.profile.accountType === 'creator'),
      blocked: members.filter((m) => me?.blocked.includes(m.id)),
    };
  }, [members, me]);
  const Row = ({ m, chat }: { m: Member; chat?: boolean }) => (
    <div className="flex flex-wrap items-center gap-3 px-3 py-3">
      <button onClick={() => nav.openMember(m.id)}><MemberAvatar member={m} people={c.people} size={44} /></button>
      <button className="min-w-0 flex-1 text-left" onClick={() => nav.openMember(m.id)}>
        <MemberName member={m} me={me} />
        {me && <div className="text-xs text-muted">{ct('disc.match')} {matchMembers(me.profile, m.profile).score}%</div>}
      </button>
      <span className="ml-auto flex items-center gap-1">
        {chat && <IconButton icon="MessageCircle" label={ct('game.message')} onClick={() => nav.openChat(m.id)} />}
        {chat && relation(me, m) === 'connected' && <IconButton icon="Gamepad2" label={ct('game.challenge')} onClick={() => nav.challenge(m.id)} />}
        <RelationButton me={me} other={m} community={c} />
      </span>
    </div>
  );
  const sections: [CKey, Member[], boolean][] = [
    ['conn.incoming', groups.incoming, false], ['conn.connected', groups.connected, true], ['following', groups.following, true], ['conn.sent', groups.sent, false], ['conn.blocked', groups.blocked, false],
  ];
  if (sections.every(([, l]) => !l.length)) return <Card><EmptyState icon="Users" title={ct('tab.connections')} text={ct('conn.none')} /></Card>;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {sections.filter(([, l]) => l.length).map(([k, l, chat]) => (
        <section key={k}>
          <SectionHeader title={<span>{ct(k)} <span className="text-sm font-normal text-muted num">{l.length}</span></span>} />
          <Card className="divide-y divide-line/5 p-1">{l.map((m) => <Row key={m.id} m={m} chat={chat} />)}</Card>
        </section>
      ))}
    </div>
  );
}
