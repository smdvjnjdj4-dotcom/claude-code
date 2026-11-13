import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Card, EmptyState, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { ATTR_ICON, Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useVybe } from '@/store/useVybe';
import { useT } from '@/lib/i18n';
import { navigate, useRoute } from '@/lib/router';
import type { Habit } from '@/domain/types';
import { HabitEditor } from './HabitEditor';
import { Heatmap } from './Heatmap';
import { HABIT_COLORS } from './HabitPill';
import { bestHabitStreakDays, completionRate, countInWeek, habitStreak, isDaily } from '@/domain/habits';
import { addDays, startOfWeek, todayKey } from '@/lib/date';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/motion';
import { axisProps, ChartTooltip } from '@/components/ui/chart';
import { ProgressRing } from '@/components/ui/ProgressRing';

const MILESTONES = [7, 21, 30, 66, 100];

export default function HabitsScreen() {
  const { t, lang } = useT();
  const { param } = useRoute();
  const habits = useVybe((s) => s.habits);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = habits.find((h) => h.id === detailId) ?? null;

  useEffect(() => {
    if (param === 'new') { setEditing(null); setEditorOpen(true); }
  }, [param]);

  const overall = useMemo(() => {
    const values: Record<string, number> = {};
    const active = habits.filter((h) => !h.archived);
    if (!active.length) return { values, today: 0, total: 0 };
    for (let i = 0; i < 7 * 16; i++) {
      const d = addDays(todayKey(), -i);
      const n = active.filter((h) => h.log[d]).length;
      if (n) values[d] = n / active.length;
    }
    return { values, today: active.filter((h) => h.log[todayKey()]).length, total: active.length };
  }, [habits]);

  return (
    <Page>
      <PageHeader title={t('h.title')} subtitle={`${overall.today}/${overall.total} ${t('common.today').toLowerCase()}`} actions={<Button icon="Plus" aria-label={t('h.new')} onClick={() => { setEditing(null); setEditorOpen(true); }}><span className="hidden sm:inline">{t('h.new')}</span></Button>} />
      {habits.length === 0 ? (
        <Card><EmptyState icon="Repeat" title={t('h.empty')} text={t('h.emptyText')} action={<Button size="sm" icon="Plus" onClick={() => setEditorOpen(true)}>{t('h.new')}</Button>} /></Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <SectionHeader title={t('h.overview')} action={<span className="text-xs text-muted">16 {t('common.weeks')}</span>} />
            <Heatmap values={overall.values} weeks={16} color="var(--accent)" lang={lang} />
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {habits.map((h) => <HabitCard key={h.id} habit={h} onOpen={() => setDetailId(h.id)} />)}
          </div>
        </div>
      )}
      <HabitEditor open={editorOpen} onClose={() => { setEditorOpen(false); if (param) navigate('habits'); }} habit={editing} />
      <HabitDetail habit={detail} onClose={() => setDetailId(null)} onEdit={() => { setEditing(detail); setDetailId(null); setEditorOpen(true); }} />
    </Page>
  );
}

function HabitCard({ habit, onOpen }: { habit: Habit; onOpen: () => void }) {
  const { t, lang, attr } = useT();
  const toggle = useVybe((s) => s.toggleHabit);
  const reduce = useReducedMotion();
  const c = HABIT_COLORS[habit.color];
  const today = todayKey();
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));
  const streak = habitStreak(habit);
  const inWeek = countInWeek(habit, startOfWeek(today));
  return (
    <motion.div layout={!reduce} className="card rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: `rgb(${c} / 0.15)`, color: `rgb(${c})` }}><Icon name={habit.icon} size={21} /></span>
        <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <div className="truncate font-medium">{habit.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <Icon name={ATTR_ICON[habit.attribute]} size={12} />{attr(habit.attribute)} · {isDaily(habit) ? t('h.everyDay') : `${habit.weeklyTarget}${t('h.perWeek')}`}
            {habit.reminder && <><Icon name="Bell" size={12} />{habit.reminder}</>}
          </div>
        </button>
        <button onClick={onOpen} className="flex items-center gap-1 rounded-xl bg-warn/10 px-2.5 py-1 text-sm font-semibold text-warn num" aria-label={`${t('h.streak')}: ${streak.value}`}>
          <Icon name="Flame" size={14} />{streak.value}
        </button>
      </div>
      <div className="mt-4 flex justify-between gap-1.5">
        {week.map((d) => {
          const done = !!habit.log[d];
          const future = d > today;
          return (
            <button key={d} disabled={future} onClick={() => toggle(habit.id, d)} aria-pressed={done}
              aria-label={`${habit.name} ${formatDate(d, lang, { weekday: 'long' })}`}
              className={cn('flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2 text-[11px] transition disabled:opacity-30', d === today ? 'bg-line/5 font-semibold text-fg' : 'text-faint')}>
              {formatDate(d, lang, { weekday: 'narrow' })}
              <motion.span animate={{ scale: done ? 1 : 0.85 }} className="grid h-7 w-7 place-items-center rounded-full border transition-colors"
                style={done ? { background: `rgb(${c})`, borderColor: `rgb(${c})`, color: '#fff' } : { borderColor: 'rgb(var(--line) / 0.15)' }}>
                {done && <Icon name="Check" size={14} strokeWidth={3} />}
              </motion.span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted">
        <span className="shrink-0">{t('h.thisWeek')} <span className="num font-semibold text-fg">{inWeek}/{Math.min(7, habit.weeklyTarget)}</span></span>
        <ProgressBar value={inWeek / Math.min(7, habit.weeklyTarget)} color={c} className="flex-1" />
      </div>
    </motion.div>
  );
}

function HabitDetail({ habit, onClose, onEdit }: { habit: Habit | null; onClose: () => void; onEdit: () => void }) {
  const { t, lang } = useT();
  const toggle = useVybe((s) => s.toggleHabit);
  const chart = useMemo(() => {
    if (!habit) return [];
    const start = startOfWeek(todayKey());
    return Array.from({ length: 8 }, (_, i) => {
      const ws = addDays(start, -(7 - i) * 7);
      return { week: formatDate(ws, lang), value: countInWeek(habit, ws) };
    });
  }, [habit, lang]);
  if (!habit) return <Sheet open={false} onClose={onClose} title=""><div /></Sheet>;
  const c = HABIT_COLORS[habit.color];
  const streak = habitStreak(habit);
  const best = bestHabitStreakDays(habit);
  const rate = completionRate(habit);
  const values = Object.fromEntries(Object.keys(habit.log).map((d) => [d, 1]));
  return (
    <Sheet open={!!habit} onClose={onClose} title={habit.name} footer={<Button variant="secondary" icon="Pencil" className="flex-1" onClick={onEdit}>{t('common.edit')}</Button>}>
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="card rounded-2xl p-3"><div className="font-display text-2xl font-bold num">{streak.value}</div><div className="text-xs text-muted">{t('h.streak')} ({streak.unit === 'days' ? t('common.days') : t('common.weeks')})</div></div>
          <div className="card rounded-2xl p-3"><div className="font-display text-2xl font-bold num">{best}</div><div className="text-xs text-muted">{t('h.best')} ({t('common.days')})</div></div>
          <div className="card grid place-items-center rounded-2xl p-2">
            <ProgressRing value={rate} size={56} stroke={6} color={c}><span className="text-xs font-bold num">{Math.round(rate * 100)}%</span></ProgressRing>
            <div className="text-xs text-muted">{t('h.rate')}</div>
          </div>
        </div>
        <div>
          <SectionHeader title={t('h.heatmap')} />
          <Heatmap values={values} weeks={12} color={c} lang={lang} onToggle={(d) => toggle(habit.id, d)} editableDays={6} />
          <p className="mt-2 text-xs text-faint">{t('h.tapHint')}</p>
        </div>
        <div>
          <SectionHeader title={t('h.chart')} />
          <div className="h-36">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="week" {...axisProps} interval={1} />
                <Tooltip cursor={{ fill: 'rgb(var(--line) / 0.05)' }} content={<ChartTooltip />} />
                <Bar dataKey="value" fill={`rgb(${c})`} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <SectionHeader title={t('h.milestones')} />
          <div className="space-y-2.5">
            {MILESTONES.map((m) => (
              <div key={m} className="flex items-center gap-3 text-sm">
                <span className={cn('grid h-8 w-8 place-items-center rounded-xl', best >= m ? 'bg-warn/15 text-warn' : 'bg-line/5 text-faint')}><Icon name={best >= m ? 'Medal' : 'Lock'} size={15} /></span>
                <span className="w-16 num">{m} {t('common.days')}</span>
                <ProgressBar value={best / m} className="flex-1" />
                {best >= m && <Badge tone="warn">✓</Badge>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
