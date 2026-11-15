import logo from '@/assets/icon.svg';
import { motion } from 'framer-motion';
import { navigate, type Route } from '@/lib/router';
import { Icon } from '@/components/ui/Icon';
import { useT, type TKey } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { useVybe } from '@/store/useVybe';
import { useProgress } from '@/store/selectors';
import { Avatar } from '@/components/ui/Avatar';

const MOBILE: { route: Route; icon: string; label: TKey }[] = [
  { route: 'home', icon: 'Home', label: 'nav.home' },
  { route: 'missions', icon: 'Target', label: 'nav.missions' },
  { route: 'habits', icon: 'Repeat', label: 'nav.habits' },
  { route: 'community', icon: 'Users', label: 'nav.community' },
  { route: 'more', icon: 'MoreHorizontal', label: 'nav.more' },
];
export const SECONDARY: { route: Route; icon: string; label: TKey }[] = [
  { route: 'money', icon: 'Wallet', label: 'nav.money' },
  { route: 'character', icon: 'Hexagon', label: 'nav.character' },
  { route: 'companion', icon: 'Sparkles', label: 'nav.companion' },
  { route: 'achievements', icon: 'Trophy', label: 'nav.achievements' },
  { route: 'social', icon: 'Swords', label: 'nav.social' },
  { route: 'stats', icon: 'BarChart3', label: 'nav.stats' },
  { route: 'settings', icon: 'Settings', label: 'nav.settings' },
];
const MORE_ROUTES = new Set<Route>(['more', ...SECONDARY.map((s) => s.route)]);

export function BottomNav({ current }: { current: Route }) {
  const { t } = useT();
  return (
    <nav aria-label="Main" className="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {MOBILE.map((item) => {
          const active = item.route === 'more' ? MORE_ROUTES.has(current) : current === item.route;
          return (
            <li key={item.route} className="flex-1">
              <button
                onClick={() => navigate(item.route)}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors', active ? 'text-fg' : 'text-faint')}
              >
                {active && <motion.span layoutId="nav-pill" transition={spring} className="absolute top-1 h-8 w-14 rounded-2xl bg-accent/15" />}
                <Icon name={item.icon} size={21} className={cn('relative', active && 'text-accent')} strokeWidth={active ? 2.2 : 1.8} />
                <span className="relative">{t(item.label)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav({ current }: { current: Route }) {
  const { t } = useT();
  const profile = useVybe((s) => s.profile);
  const { level } = useProgress();
  const items = [...MOBILE.slice(0, 4), ...SECONDARY];
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r hairline px-4 py-6 lg:flex">
      <button onClick={() => navigate('home')} className="mb-8 flex items-center gap-2.5 px-3">
        <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
        <span className="font-display text-xl font-bold tracking-tight">VYBE</span>
      </button>
      <nav aria-label="Main" className="flex-1">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = current === item.route;
            return (
              <li key={item.route}>
                <button
                  onClick={() => navigate(item.route)}
                  aria-current={active ? 'page' : undefined}
                  className={cn('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', active ? 'text-fg' : 'text-muted hover:bg-line/5 hover:text-fg')}
                >
                  {active && <motion.span layoutId="side-pill" transition={spring} className="absolute inset-0 rounded-xl border border-accent/25 bg-accent/10" />}
                  <Icon name={item.icon} size={19} className={cn('relative', active && 'text-accent')} />
                  <span className="relative">{t(item.label)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {profile && (
        <button onClick={() => navigate('character')} className="card flex items-center gap-3 rounded-2xl p-3 text-left">
          <Avatar name={profile.name} size={40} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{profile.name}</div>
            <div className="text-xs text-muted">{t('common.level')} {level.level}</div>
          </div>
        </button>
      )}
    </aside>
  );
}
