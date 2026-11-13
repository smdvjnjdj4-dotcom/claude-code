import { AnimatePresence, MotionConfig } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { useVybe } from '@/store/useVybe';
import { useRoute, type Route } from '@/lib/router';
import { useReducedMotion } from '@/lib/motion';
import { useReminders, useThemeEffect } from '@/lib/useAppEffects';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { BottomNav, SideNav } from '@/components/layout/Navigation';
import { Celebrations, RewardLayer, Toasts } from '@/components/layout/Overlays';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { HomeScreen } from '@/features/home/HomeScreen';
import { PageSkeleton } from '@/components/layout/PageSkeleton';

const MissionsScreen = lazy(() => import('@/features/missions/MissionsScreen'));
const HabitsScreen = lazy(() => import('@/features/habits/HabitsScreen'));
const MoneyScreen = lazy(() => import('@/features/money/MoneyScreen'));
const CharacterScreen = lazy(() => import('@/features/character/CharacterScreen'));
const AchievementsScreen = lazy(() => import('@/features/achievements/AchievementsScreen'));
const SocialScreen = lazy(() => import('@/features/social/SocialScreen'));
const CompanionScreen = lazy(() => import('@/features/companion/CompanionScreen'));
const StatsScreen = lazy(() => import('@/features/stats/StatsScreen'));
const SettingsScreen = lazy(() => import('@/features/settings/SettingsScreen'));
const MoreScreen = lazy(() => import('@/features/settings/MoreScreen'));

function Screen({ route }: { route: Route }) {
  switch (route) {
    case 'missions': return <MissionsScreen />;
    case 'habits': return <HabitsScreen />;
    case 'money': return <MoneyScreen />;
    case 'character': return <CharacterScreen />;
    case 'achievements': return <AchievementsScreen />;
    case 'social': return <SocialScreen />;
    case 'companion': return <CompanionScreen />;
    case 'stats': return <StatsScreen />;
    case 'settings': return <SettingsScreen />;
    case 'more': return <MoreScreen />;
    default: return <HomeScreen />;
  }
}

export default function App() {
  const hydrated = useVybe((s) => s.hydrated);
  const onboarded = useVybe((s) => s.onboarded);
  const justOnboarded = useVybe((s) => s.justOnboarded);
  const { route } = useRoute();
  const reduce = useReducedMotion();
  useThemeEffect();
  useReminders();

  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>
      <AmbientBackground />
      {!hydrated ? (
        <div className="flex min-h-dvh"><div className="flex-1"><PageSkeleton /></div></div>
      ) : !onboarded || justOnboarded ? (
        <Onboarding />
      ) : (
        <div className="flex min-h-dvh">
          <SideNav current={route} />
          <div className="min-w-0 flex-1">
            <ErrorBoundary resetKey={route}>
              <Suspense fallback={<PageSkeleton />}>
                <AnimatePresence mode="wait" initial={false}>
                  <Screen key={route} route={route} />
                </AnimatePresence>
              </Suspense>
            </ErrorBoundary>
          </div>
          <BottomNav current={route} />
        </div>
      )}
      <RewardLayer />
      <Toasts />
      <Celebrations />
    </MotionConfig>
  );
}
