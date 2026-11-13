import { useState } from 'react';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Card, Chip, EmptyState, Field, IconButton, Input, ProgressBar, Segmented, SectionHeader } from '@/components/ui/primitives';
import { ATTR_ICON, Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Avatar } from '@/components/ui/Avatar';
import { useVybe, pickData } from '@/store/useVybe';
import { useProgress } from '@/store/selectors';
import { useT } from '@/lib/i18n';
import { challengeProgress, localSocial } from '@/social/backend';
import { ATTRIBUTES, type Attribute, type Challenge } from '@/domain/types';
import { diffDays, todayKey } from '@/lib/date';
import { shareText } from '@/lib/share';
import { cn } from '@/lib/cn';

type Tab = 'challenges' | 'friends' | 'groups';

export default function SocialScreen() {
  const { t } = useT();
  const state = useVybe();
  const setData = useVybe((s) => s.setData);
  const toast = useVybe((s) => s.toast);
  const { level, streak } = useProgress();
  const [tab, setTab] = useState<Tab>('challenges');
  const [sheet, setSheet] = useState<null | 'challenge' | 'friend' | 'group'>(null);
  const data = pickData(state);

  const share = async () => {
    const r = await shareText(t('so.shareText', { level: level.level, streak }));
    if (r === 'copied') toast(t('a.copied'));
  };

  return (
    <Page>
      <PageHeader title={t('so.title')} actions={<Button variant="secondary" icon="Share2" aria-label={t('so.share')} onClick={share}><span className="hidden sm:inline">{t('so.share')}</span></Button>} />
      <div className="mb-4 flex items-start gap-2 rounded-2xl border hairline bg-line/[0.03] p-3.5 text-xs text-muted">
        <Icon name="Globe" size={15} className="mt-px shrink-0 text-accent2" />{t('so.demoNote')}
      </div>
      <Segmented label="social" value={tab} onChange={setTab} className="mb-5" options={[
        { value: 'challenges', label: t('so.challenges') }, { value: 'friends', label: t('so.friends') }, { value: 'groups', label: t('so.groups') },
      ]} />

      {tab === 'challenges' && (
        <>
          <SectionHeader title={t('so.challenges')} action={<Button size="sm" variant="ghost" icon="Plus" onClick={() => setSheet('challenge')}>{t('so.newChallenge')}</Button>} />
          <div className="grid gap-4 md:grid-cols-2">
            {state.challenges.map((c) => <ChallengeCard key={c.id} c={c} you={challengeProgress(data, c)} name={state.profile?.name ?? t('so.you')}
              onToggle={() => setData((d) => localSocial.setJoined(d, c.id, !c.joined))}
              onDelete={c.kind === 'local' ? () => setData((d) => localSocial.deleteChallenge(d, c.id)) : undefined} />)}
          </div>
          {state.challenges.length === 0 && <Card><EmptyState icon="Swords" title={t('so.challenges')} text={t('so.demoNote')} /></Card>}
        </>
      )}

      {tab === 'friends' && (
        <>
          <SectionHeader title={t('so.friends')} action={<Button size="sm" variant="ghost" icon="Plus" onClick={() => setSheet('friend')}>{t('so.addFriend')}</Button>} />
          {state.friends.length === 0 ? <Card><EmptyState icon="Users" title={t('so.friends')} text={t('so.noFriends')} action={<Button size="sm" icon="Plus" onClick={() => setSheet('friend')}>{t('so.addFriend')}</Button>} /></Card> : (
            <Card className="divide-y divide-line/5 p-2">
              {state.friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-3">
                  <Avatar name={f.name} size={40} />
                  <div className="flex-1">
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-faint">{t('so.localFriend')}</div>
                  </div>
                  <Badge tone={f.kind === 'demo' ? 'warn' : 'default'}>{f.kind === 'demo' ? t('so.demoTag') : t('so.localTag')}</Badge>
                  <IconButton icon="Trash2" label={t('common.delete')} onClick={() => setData((d) => localSocial.removeFriend(d, f.id))} />
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {tab === 'groups' && (
        <>
          <SectionHeader title={t('so.groups')} action={<Button size="sm" variant="ghost" icon="Plus" onClick={() => setSheet('group')}>{t('so.newGroup')}</Button>} />
          {state.groups.length === 0 ? <Card><EmptyState icon="Shield" title={t('so.groups')} text={t('so.noGroups')} action={<Button size="sm" icon="Plus" onClick={() => setSheet('group')}>{t('so.newGroup')}</Button>} /></Card> : (
            <div className="grid gap-3 md:grid-cols-2">
              {state.groups.map((g) => (
                <Card key={g.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium"><Icon name="Shield" size={16} className="text-accent" />{g.name}</div>
                    <IconButton icon="Trash2" label={t('common.delete')} onClick={() => setData((d) => localSocial.deleteGroup(d, g.id))} />
                  </div>
                  <div className="mt-3 flex -space-x-2">
                    <Avatar name={state.profile?.name ?? 'Du'} size={32} />
                    {g.memberIds.map((m) => { const f = state.friends.find((x) => x.id === m); return f ? <Avatar key={m} name={f.name} size={32} /> : null; })}
                  </div>
                  <p className="mt-2 text-xs text-faint">{g.memberIds.length + 1} {t('so.members')} · {t('so.localTag')}</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ChallengeSheet open={sheet === 'challenge'} onClose={() => setSheet(null)} />
      <FriendSheet open={sheet === 'friend'} onClose={() => setSheet(null)} />
      <GroupSheet open={sheet === 'group'} onClose={() => setSheet(null)} />
    </Page>
  );
}

function ChallengeCard({ c, you, name, onToggle, onDelete }: { c: Challenge; you: number; name: string; onToggle: () => void; onDelete?: () => void }) {
  const { t, attr } = useT();
  const left = diffDays(c.endDate, todayKey());
  const board = [...c.participants.map((p) => ({ ...p, you: false })), ...(c.joined ? [{ name, progress: you, demo: false, you: true }] : [])].sort((a, b) => b.progress - a.progress);
  return (
    <Card className={cn('p-5', c.joined && 'glow-border')}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent"><Icon name={ATTR_ICON[c.attribute]} size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="font-semibold">{c.title}</span><Badge tone={c.kind === 'demo' ? 'warn' : 'default'}>{c.kind === 'demo' ? t('so.demoTag') : t('so.localTag')}</Badge></div>
          <p className="mt-0.5 text-xs text-muted">{c.description}</p>
          <p className="mt-1 text-xs text-faint">{attr(c.attribute)} · {left >= 0 ? t('so.daysLeft', { n: left + 1 }) : t('so.ended')}</p>
        </div>
      </div>
      {c.joined && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs"><span className="text-muted">{t('so.you')}</span><span className="num">{t('so.progress', { n: you, goal: c.goalDays })}</span></div>
          <ProgressBar value={you / c.goalDays} />
        </div>
      )}
      {board.length > 0 && (
        <div className="mt-4">
          <div className="label">{t('so.compare')}</div>
          <ol className="space-y-1.5">
            {board.map((p, i) => (
              <li key={p.name + i} className={cn('flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm', p.you && 'bg-accent/10')}>
                <span className="w-4 text-xs text-faint num">{i + 1}</span>
                <span className="flex-1 truncate">{p.you ? `${p.name} (${t('so.you')})` : p.name}</span>
                {p.demo && <Badge tone="warn">{t('so.demoTag')}</Badge>}
                <span className="w-12 text-right text-xs num text-muted">{p.progress}/{c.goalDays}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant={c.joined ? 'secondary' : 'primary'} className="flex-1" onClick={onToggle} disabled={left < 0}>{c.joined ? t('so.leave') : t('so.join')}</Button>
        {onDelete && <IconButton icon="Trash2" label={t('common.delete')} onClick={onDelete} />}
      </div>
    </Card>
  );
}

function ChallengeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, attr } = useT();
  const setData = useVybe((s) => s.setData);
  const [title, setTitle] = useState('');
  const [attribute, setAttribute] = useState<Attribute>('fitness');
  const [lengthDays, setLength] = useState(7);
  const [goalDays, setGoal] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const tt = title.trim();
    if (tt.length < 2 || tt.length > 60) return setError(t('so.err.title'));
    setData((d) => localSocial.createChallenge(d, { title: tt, description: `${attr(attribute)} · ${t('so.progress', { n: goalDays, goal: lengthDays })}`, attribute, goalDays: Math.min(goalDays, lengthDays), lengthDays }));
    setTitle(''); setError(null); onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('so.newChallenge')} footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button><Button className="flex-1" onClick={submit}>{t('common.save')}</Button></>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={t('so.chTitle')} error={error}><Input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div><span className="label">{t('m.attribute')}</span><div className="flex flex-wrap gap-2">{ATTRIBUTES.map((a) => <Chip key={a} icon={ATTR_ICON[a]} selected={attribute === a} onClick={() => setAttribute(a)}>{attr(a)}</Chip>)}</div></div>
        <div><span className="label">{t('so.chLength')}</span><div className="flex flex-wrap gap-2">{[7, 14, 21, 30].map((n) => <Chip key={n} selected={lengthDays === n} onClick={() => { setLength(n); setGoal(Math.min(goalDays, n)); }}>{n}</Chip>)}</div></div>
        <div><span className="label">{t('so.chDays')}</span><div className="flex flex-wrap gap-2">{[3, 5, 7, 10, 14, 21, 30].filter((n) => n <= lengthDays).map((n) => <Chip key={n} selected={goalDays === n} onClick={() => setGoal(n)}>{n}</Chip>)}</div></div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function FriendSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const setData = useVybe((s) => s.setData);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const n = name.trim();
    if (n.length < 2 || n.length > 30) return setError(t('ob.err.name'));
    setData((d) => localSocial.addFriend(d, n));
    setName(''); setError(null); onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('so.addFriend')} footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button><Button className="flex-1" onClick={submit}>{t('common.add')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={t('so.friendName')} error={error} hint={t('so.localFriend')}><Input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} /></Field>
      </form>
    </Sheet>
  );
}

function GroupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const friends = useVybe((s) => s.friends);
  const setData = useVybe((s) => s.setData);
  const [name, setName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const n = name.trim();
    if (n.length < 2 || n.length > 40) return setError(t('f.err.name'));
    setData((d) => localSocial.createGroup(d, n, members));
    setName(''); setMembers([]); setError(null); onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('so.newGroup')} footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button><Button className="flex-1" onClick={submit}>{t('common.save')}</Button></>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={t('so.groupName')} error={error}><Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></Field>
        <div>
          <span className="label">{t('so.members')}</span>
          {friends.length === 0 ? <p className="text-sm text-muted">{t('so.noFriends')}</p> : (
            <div className="flex flex-wrap gap-2">{friends.map((f) => <Chip key={f.id} selected={members.includes(f.id)} onClick={() => setMembers(members.includes(f.id) ? members.filter((m) => m !== f.id) : [...members, f.id])}>{f.name}</Chip>)}</div>
          )}
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
