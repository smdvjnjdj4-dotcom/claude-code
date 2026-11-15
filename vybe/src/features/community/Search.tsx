import { useMemo, useState } from 'react';
import { Card, EmptyState, Input, Segmented, SectionHeader } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useCommunity } from '@/community/CommunityContext';
import { useCT, type CKey } from '@/community/i18n';
import { followerCount, matchMembers, relation } from '@/community/model';
import { interestLabel } from '@/community/options';
import type { Member } from '@/community/types';
import { FollowButton, MemberAvatar, MemberName } from './parts';
import { useNav } from './nav';

/** Profile search: name, @handle, city and interests, ranked by how well the query matches. */
export function Search() {
  const { ct, lang } = useCT();
  const c = useCommunity();
  const nav = useNav();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'all' | 'creators' | 'people'>('all');
  const visible = useMemo(() => c.members.filter((m) => { const r = relation(c.me, m); return r !== 'self' && r !== 'blocked' && (m.profile.discoverable || r === 'connected'); }), [c.members, c.me]);
  const results = useMemo(() => {
    const query = q.trim().toLowerCase().replace(/^@/, '');
    if (!query) return [];
    return visible
      .filter((m) => kind === 'all' || (kind === 'creators') === (m.profile.accountType === 'creator'))
      .map((m) => {
        const p = m.profile;
        let score = 0;
        if (p.handle === query) score += 100;
        else if (p.handle.startsWith(query)) score += 60;
        if (p.nickname.toLowerCase().startsWith(query)) score += 50;
        else if (p.nickname.toLowerCase().includes(query)) score += 30;
        if (p.city.toLowerCase().includes(query)) score += 15;
        const hits = Object.values(p.interests).flat().filter((v) => interestLabel(v, lang).toLowerCase().includes(query));
        score += Math.min(4, hits.length) * 8;
        if (p.bio.toLowerCase().includes(query)) score += 5;
        if (p.creatorCategory && ct(`ccat.${p.creatorCategory}` as CKey).toLowerCase().includes(query)) score += 20;
        return { m, score, hits };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [visible, q, kind, lang, ct]);
  const topCreators = useMemo(() => visible.filter((m) => m.profile.accountType === 'creator').sort((a, b) => followerCount(c.members, b.id) - followerCount(c.members, a.id)).slice(0, 6), [visible, c.members]);

  const Row = ({ m, hits }: { m: Member; hits?: string[] }) => (
    <div className="flex items-center gap-3 px-3 py-3">
      <button onClick={() => nav.openMember(m.id)}><MemberAvatar member={m} people={c.people} size={44} /></button>
      <button className="min-w-0 flex-1 text-left" onClick={() => nav.openMember(m.id)}>
        <MemberName member={m} me={c.me} />
        <div className="truncate text-xs text-muted">
          {[m.profile.handle && `@${m.profile.handle}`, m.profile.accountType === 'creator' ? ct('followers', { n: followerCount(c.members, m.id) }) : m.profile.city, c.me ? `${ct('disc.match')} ${matchMembers(c.me.profile, m.profile).score}%` : ''].filter(Boolean).join(' · ')}
        </div>
        {hits && hits.length > 0 && <div className="truncate text-xs text-accent">{hits.slice(0, 3).map((h) => interestLabel(h, lang)).join(' · ')}</div>}
      </button>
      <FollowButton other={m} />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="relative">
        <Icon name="Search" size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
        <Input id="search-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={ct('search.ph')} aria-label={ct('search.ph')} className="pl-11" autoCapitalize="off" />
      </div>
      <Segmented label="searchkind" value={kind} onChange={setKind} options={[{ value: 'all', label: ct('search.all') }, { value: 'creators', label: ct('search.creators') }, { value: 'people', label: ct('search.people') }]} />
      {!q.trim() ? (
        <>
          {topCreators.length > 0 && (
            <section>
              <SectionHeader title={ct('search.topCreators')} />
              <Card className="divide-y divide-line/5 p-1">{topCreators.map((m) => <Row key={m.id} m={m} />)}</Card>
            </section>
          )}
          <p className="text-center text-sm text-faint">{ct('search.hint')}</p>
        </>
      ) : results.length === 0 ? (
        <Card><EmptyState icon="Search" title={ct('tab.search')} text={ct('search.none', { q: q.trim() })} /></Card>
      ) : (
        <Card className="divide-y divide-line/5 p-1">{results.map(({ m, hits }) => <Row key={m.id} m={m} hits={hits} />)}</Card>
      )}
    </div>
  );
}
