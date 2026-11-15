import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Button, Card, Chip, EmptyState, Input } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useCommunity } from '@/community/CommunityContext';
import { useCT } from '@/community/i18n';
import { matchMembers, relation } from '@/community/model';
import { interestLabel, OPTIONS } from '@/community/options';
import { useReducedMotion } from '@/lib/motion';
import { FollowButton, InterestChip, MemberAvatar, MemberName, RelationButton } from './parts';
import { useNav } from './nav';

export function MatchRing({ score }: { score: number }) {
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

export function Discover() {
  const { ct, lang } = useCT();
  const reduce = useReducedMotion();
  const c = useCommunity();
  const nav = useNav();
  const { me, members, backend } = c;
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
        const hay = [m.profile.nickname, m.profile.handle, m.profile.city, m.profile.bio, ...Object.values(m.profile.interests).flat().map((v) => interestLabel(v, lang))].join(' ').toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => b.match.score - a.match.score || b.m.profile.updatedAt.localeCompare(a.m.profile.updatedAt));
  }, [members, me, q, lookingFor, ageBand, lang]);

  const filtered = q || lookingFor || ageBand !== 'all';
  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Icon name="Search" size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
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
            <motion.div key={m.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="card flex flex-col rounded-3xl p-5">
              <button className="flex items-center gap-3 text-left" onClick={() => nav.openMember(m.id)}>
                <MemberAvatar member={m} people={c.people} size={52} />
                <div className="min-w-0 flex-1">
                  <MemberName member={m} me={me} />
                  <div className="truncate text-xs text-muted">{[m.profile.handle ? `@${m.profile.handle}` : '', m.profile.age && m.profile.showAge ? ct('profile.years', { n: m.profile.age }) : '', m.profile.city].filter(Boolean).join(' · ')}</div>
                </div>
                {me && <MatchRing score={match.score} />}
              </button>
              {m.profile.bio && <p className="mt-3 line-clamp-2 text-sm text-muted">{m.profile.bio}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {match.common.length > 0
                  ? match.common.slice(0, 6).map((x) => <InterestChip key={x.key + x.value} value={x.value} common />)
                  : [...m.profile.interests.lookingFor, ...m.profile.interests.musicGenres, ...m.profile.interests.hobbies].slice(0, 5).map((v) => <InterestChip key={v} value={v} />)}
                {match.common.length > 6 && <span className="self-center text-xs text-faint">+{match.common.length - 6}</span>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => nav.openMember(m.id)}>{ct('tab.profile')}</Button>
                <span className="flex-1" />
                <FollowButton other={m} />
                <RelationButton me={me} other={m} community={c} />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

