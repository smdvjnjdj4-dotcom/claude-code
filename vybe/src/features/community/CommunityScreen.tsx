import { useEffect, useMemo, useState } from 'react';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Card, Skeleton } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useCommunity } from '@/community/CommunityContext';
import { useCT, type CKey } from '@/community/i18n';

import { useRoute, navigate } from '@/lib/router';
import { cn } from '@/lib/cn';
import { MemberSheet } from './MemberSheet';
import { ProfileEditor } from './ProfileEditor';
import { NavCtx, type Tab } from './nav';
import { Discover } from './Discover';
import { Feed } from './Feed';
import { Clips } from './Clips';
import { Search } from './Search';
import { Chats } from './Chats';
import { Games } from './Games';
import { Connections } from './Connections';
import { ProfileTab } from './ProfileTab';
import { useBadges } from './badges';

const TABS: { id: Tab; icon: string; label: CKey }[] = [
  { id: 'discover', icon: 'Sparkles', label: 'tab.discover' },
  { id: 'search', icon: 'Search', label: 'tab.search' },
  { id: 'feed', icon: 'Activity', label: 'tab.feed' },
  { id: 'clips', icon: 'Video', label: 'tab.clips' },
  { id: 'chats', icon: 'MessageCircle', label: 'tab.chats' },
  { id: 'games', icon: 'Gamepad2', label: 'tab.games' },
  { id: 'people', icon: 'Users', label: 'tab.connections' },
  { id: 'profile', icon: 'User', label: 'tab.profile' },
];

export default function CommunityScreen() {
  const { ct } = useCT();
  const c = useCommunity();
  const { param } = useRoute();
  const { backend, status, me } = c;
  const [tab, setTabState] = useState<Tab>('discover');
  const [editor, setEditor] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const badges = useBadges();

  // Deep links: #/community/<tab>
  useEffect(() => { if (param && TABS.some((t) => t.id === param)) setTabState(param as Tab); }, [param]);
  const setTab = (t: Tab) => { setTabState(t); navigate('community', t); };

  const nav = useMemo(() => ({
    tab, setTab,
    openMember: (id: string) => setOpenId(id),
    openChat: (id: string) => { setChatWith(id); setTab('chats'); },
    challenge: (id: string) => { setChallengeId(id); setTab('games'); },
    editProfile: () => setEditor(true),
  }), [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const openMember = openId ? c.members.find((m) => m.id === openId) ?? null : null;
  const needsProfile = !me && backend?.canWrite;

  return (
    <NavCtx.Provider value={nav}>
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

        {!backend || (status === 'loading' && c.members.length === 0) ? (
          <div className="space-y-3" aria-label={ct('status.loading')}><Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        ) : (
          <>
            {needsProfile && (
              <Card className="glow-border mb-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-accent text-white shadow-glow"><Icon name="Users" size={22} /></span>
                <div className="flex-1">
                  <h2 className="font-display text-lg font-semibold">{ct('create.title')}</h2>
                  <p className="text-sm text-muted">{ct('create.text')}</p>
                </div>
                <Button icon="Sparkles" onClick={() => setEditor(true)}>{ct('create.cta')}</Button>
              </Card>
            )}
            <nav aria-label={ct('title')} className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
              {TABS.map((t) => {
                const active = tab === t.id;
                const n = badges[t.id] ?? 0;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} aria-current={active ? 'page' : undefined}
                    className={cn('relative flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition', active ? 'border-accent/50 bg-accent/15 text-fg' : 'hairline bg-elevated/40 text-muted hover:text-fg')}>
                    <Icon name={t.icon} size={15} className={active ? 'text-accent' : ''} />{ct(t.label)}
                    {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-white num">{n}</span>}
                  </button>
                );
              })}
            </nav>
            {tab === 'discover' && <Discover />}
            {tab === 'search' && <Search />}
            {tab === 'feed' && <Feed />}
            {tab === 'clips' && <Clips />}
            {tab === 'chats' && <Chats openWith={chatWith} onOpened={() => setChatWith(null)} />}
            {tab === 'games' && <Games challengeId={challengeId} onChallengeHandled={() => setChallengeId(null)} />}
            {tab === 'people' && <Connections />}
            {tab === 'profile' && <ProfileTab />}
          </>
        )}
        <ProfileEditor open={editor} onClose={() => setEditor(false)} />
        <MemberSheet member={openMember} onClose={() => setOpenId(null)} />
      </Page>
    </NavCtx.Provider>
  );
}

