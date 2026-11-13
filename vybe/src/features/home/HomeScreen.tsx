import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Page } from '@/components/layout/Page';
import { useVybe } from '@/store/useVybe';
import { useProgress, useTodayHabits, useTodayMissions } from '@/store/selectors';
import { useT } from '@/lib/i18n';
import { navigate } from '@/lib/router';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button, Card, EmptyState, IconButton, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { MissionRow } from '@/features/missions/MissionRow';
import { HabitPill } from '@/features/habits/HabitPill';
import { DAILY_SOFT_CAP, levelTitle } from '@/domain/progression';
import { addDays, startOfWeek, todayKey } from '@/lib/date';
import { formatDate, formatNumber } from '@/lib/format';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { isMissionDone } from '@/domain/engine';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

export function HomeScreen() {
  const { t, lang } = useT();
  const profile = useVybe((s) => s.profile)!;
  const ledger = useVybe((s) => s.ledger);
  const resetAll = useVybe((s) => s.resetAll);
  const progress = useProgress();
  const missions = useTodayMissions();
  const habits = useTodayHabits();
  const reduce = useReducedMotion();

  const hour = new Date().getHours();
  const greet = hour < 5 ? t('home.night') : hour < 12 ? t('home.morning') : hour < 18 ? t('home.afternoon') : t('home.evening');
  const total = missions.total + habits.total;
  const doneAll = missions.done + habits.done;
  const dayPct = total ? doneAll / total : 0;

  const week = useMemo(() => {
    const start = startOfWeek(todayKey());
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const values = days.map((d) => ledger.filter((e) => e.date === d && !e.key.startsWith('ach:')).reduce((s, e) => s + e.xp, 0));
    return { days, values, max: Math.max(100, ...values), sum: values.reduce((a, b) => a + b, 0) };
  }, [ledger]);

  const sortedMissions = [...missions.list].sort((a, b) => Number(isMissionDone(a, todayKey())) - Number(isMissionDone(b, todayKey())));

  return (
    <Page>
      <motion.div variants={stagger} initial={reduce ? false : 'hidden'} animate="show" className="space-y-6">
        {/* Header */}
        <motion.header variants={item} className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted">{formatDate(todayKey(), lang, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="mt-0.5 truncate font-display text-[28px] font-semibold tracking-tight sm:text-[34px]">
              {greet}, <span className="text-gradient">{profile.name}</span>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <IconButton icon="Sparkles" label={t('nav.companion')} onClick={() => navigate('companion')} className="text-accent" />
            <IconButton icon="Settings" label={t('nav.settings')} onClick={() => navigate('settings')} className="lg:hidden" />
          </div>
        </motion.header>

        {profile.isDemo && (
          <motion.div variants={item} className="flex flex-col gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-fg"><Icon name="Sparkles" size={16} className="mt-0.5 shrink-0 text-warn" />{t('home.demoBanner')}</p>
            <Button size="sm" variant="secondary" onClick={resetAll}>{t('home.demoReset')}</Button>
          </motion.div>
        )}

        {/* Character progression hero */}
        <motion.div variants={item} className="grid gap-4 md:grid-cols-5">
          <Card className="glow-border relative overflow-hidden md:col-span-3" interactive onClick={() => navigate('character')} role="link" aria-label={t('nav.character')}>
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative flex items-center gap-5">
              <ProgressRing value={progress.level.pct} size={124} stroke={9} label={`${Math.round(progress.level.pct * 100)}%`}>
                <Avatar name={profile.name} size={78} />
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">{levelTitle(progress.level.level, lang)}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-sm text-muted">{t('common.level')}</span>
                  <AnimatedNumber value={progress.level.level} className="font-display text-5xl font-bold leading-none" />
                </div>
                <div className="mt-3">
                  <ProgressBar value={progress.level.pct} />
                  <div className="mt-2 flex justify-between text-xs text-muted num">
                    <span><AnimatedNumber value={progress.level.intoLevel} format={(n) => formatNumber(n, lang)} /> / {formatNumber(progress.level.needed, lang)} XP</span>
                    <span>{t('home.toNext', { xp: formatNumber(progress.level.needed - progress.level.intoLevel, lang), level: progress.level.level + 1 })}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative mt-5 grid grid-cols-3 gap-2 border-t hairline pt-4">
              <Stat icon="Zap" label={t('common.xp')} value={<AnimatedNumber value={progress.level.totalXp} format={(n) => formatNumber(n, lang)} />} />
              <Stat icon="Flame" tone="text-warn" label={t('home.streak')} value={<><AnimatedNumber value={progress.streak} /> <span className="text-xs font-normal text-muted">{t('common.days')}</span></>} />
              <Stat icon="Snowflake" tone="text-accent2" label={t('home.freezes')} value={progress.freezes} />
            </div>
          </Card>

          <Card className="flex flex-col items-center justify-center text-center md:col-span-2">
            <ProgressRing value={dayPct} size={150} stroke={12} label={t('home.dailyProgress')}>
              <div>
                <div className="font-display text-4xl font-bold num">{Math.round(dayPct * 100)}<span className="text-xl text-muted">%</span></div>
                <div className="text-xs text-muted num">{doneAll}/{total}</div>
              </div>
            </ProgressRing>
            <p className="mt-3 font-display text-sm font-semibold">{t('home.dailyProgress')}</p>
            <p className="text-xs text-muted num">+{progress.xpToday} {t('home.xpToday')}</p>
            {progress.xpToday >= DAILY_SOFT_CAP && <p className="mt-2 text-xs text-accent2">{t('home.capNote', { cap: DAILY_SOFT_CAP })}</p>}
          </Card>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={item} className="grid grid-cols-4 gap-3">
          {[
            { icon: 'Target', label: t('home.qa.mission'), go: () => navigate('missions', 'new') },
            { icon: 'Wallet', label: t('home.qa.expense'), go: () => navigate('money', 'new') },
            { icon: 'Repeat', label: t('home.qa.habit'), go: () => navigate('habits', 'new') },
            { icon: 'Sparkles', label: t('home.qa.ask'), go: () => navigate('companion') },
          ].map((q) => (
            <motion.button key={q.icon} whileTap={reduce ? undefined : { scale: 0.94 }} whileHover={reduce ? undefined : { y: -2 }} onClick={q.go} className="card flex flex-col items-center gap-2 rounded-2xl py-4 text-xs font-medium text-muted hover:text-fg">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/12 text-accent" style={{ background: 'rgb(var(--accent) / 0.12)' }}><Icon name={q.icon} size={19} /></span>
              {q.label}
            </motion.button>
          ))}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Missions */}
          <motion.section variants={item} className="min-w-0 lg:col-span-3" aria-labelledby="h-missions">
            <SectionHeader
              title={<span id="h-missions">{t('home.todayMissions')} <span className="ml-1 text-sm font-normal text-muted num">{missions.done}/{missions.total}</span></span>}
              action={<button onClick={() => navigate('missions')} className="text-sm text-accent hover:underline">{t('common.seeAll')}</button>}
            />
            {missions.total === 0 ? (
              <Card><EmptyState icon="Target" title={t('home.noMissions')} text={t('home.noMissionsText')} action={<Button size="sm" icon="Plus" onClick={() => navigate('missions', 'new')}>{t('m.new')}</Button>} /></Card>
            ) : (
              <>
                {missions.done === missions.total && <p className="mb-3 rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">{t('home.allDone')}</p>}
                <ul className="space-y-2.5">{sortedMissions.slice(0, 6).map((m) => <MissionRow key={m.id} mission={m} />)}</ul>
              </>
            )}
          </motion.section>

          <div className="min-w-0 space-y-6 lg:col-span-2">
            {/* Habits */}
            <motion.section variants={item} className="min-w-0" aria-labelledby="h-habits">
              <SectionHeader
                title={<span id="h-habits">{t('home.todayHabits')} <span className="ml-1 text-sm font-normal text-muted num">{habits.done}/{habits.total}</span></span>}
                action={<button onClick={() => navigate('habits')} className="text-sm text-accent hover:underline">{t('common.seeAll')}</button>}
              />
              {habits.total === 0 ? (
                <Card><EmptyState icon="Repeat" title={t('home.noHabits')} text={t('home.noHabitsText')} action={<Button size="sm" icon="Plus" onClick={() => navigate('habits', 'new')}>{t('h.new')}</Button>} /></Card>
              ) : (
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
                  {habits.list.map((h) => <HabitPill key={h.id} habit={h} />)}
                </div>
              )}
            </motion.section>

            {/* Weekly progress */}
            <motion.section variants={item}>
              <Card>
                <SectionHeader title={t('home.week')} action={<span className="text-sm text-muted num">{formatNumber(week.sum, lang)} XP</span>} />
                <div className="flex h-32 items-end gap-2" role="img" aria-label={`${t('home.week')}: ${week.values.join(', ')} XP`}>
                  {week.days.map((d, i) => {
                    const isToday = d === todayKey();
                    return (
                      <div key={d} className="flex flex-1 flex-col items-center gap-2">
                        <div className="relative flex w-full flex-1 items-end">
                          <motion.div
                            className={cn('w-full rounded-lg', isToday ? 'bg-gradient-accent' : 'bg-accent/30')}
                            style={{ minHeight: 4 }}
                            initial={reduce ? false : { height: 0 }}
                            animate={{ height: `${(week.values[i] / week.max) * 100}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                        <span className={cn('text-[11px]', isToday ? 'font-semibold text-fg' : 'text-faint')}>{formatDate(d, lang, { weekday: 'narrow' })}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.section>
          </div>
        </div>
      </motion.div>
    </Page>
  );
}

function Stat({ icon, label, value, tone = 'text-accent' }: { icon: string; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted"><Icon name={icon} size={14} className={tone} />{label}</div>
      <div className="mt-0.5 font-display text-lg font-semibold num">{value}</div>
    </div>
  );
}
