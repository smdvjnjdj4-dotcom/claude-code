import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Habit } from '@/domain/types';
import { useVybe } from '@/store/useVybe';
import { todayKey } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import { ParticleBurst } from '@/components/ui/Particles';
import { habitStreak } from '@/domain/habits';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n';

export const HABIT_COLORS: Record<Habit['color'], string> = {
  violet: '167 139 250', cyan: '34 211 238', emerald: '52 211 153', amber: '251 191 36', rose: '251 113 133', sky: '56 189 248',
};

/** Compact, tappable habit check-in used on Home. */
export function HabitPill({ habit }: { habit: Habit }) {
  const toggle = useVybe((s) => s.toggleHabit);
  const reduce = useReducedMotion();
  const { t } = useT();
  const done = !!habit.log[todayKey()];
  const [burst, setBurst] = useState(0);
  const c = HABIT_COLORS[habit.color];
  const streak = habitStreak(habit);
  return (
    <motion.button
      whileTap={reduce ? undefined : { scale: 0.95 }}
      onClick={() => { if (!done) setBurst((b) => b + 1); toggle(habit.id); }}
      aria-pressed={done}
      className={cn('card relative flex min-w-[140px] flex-col items-start gap-3 rounded-2xl p-4 text-left transition-all')}
      style={done ? { borderColor: `rgb(${c} / 0.5)`, boxShadow: `0 0 28px -10px rgb(${c} / 0.7)` } : undefined}
    >
      <span className="relative grid h-10 w-10 place-items-center rounded-xl transition-colors" style={{ background: done ? `rgb(${c})` : `rgb(${c} / 0.14)`, color: done ? '#fff' : `rgb(${c})` }}>
        <Icon name={done ? 'Check' : habit.icon} size={19} strokeWidth={done ? 2.6 : 1.8} />
        {burst > 0 && !reduce && <ParticleBurst key={burst} color={c} count={10} />}
      </span>
      <span className="w-full truncate text-sm font-medium">{habit.name}</span>
      <span className="flex items-center gap-1 text-xs text-muted num">
        <Icon name="Flame" size={13} className={streak.value ? 'text-warn' : ''} />
        {streak.value} {streak.unit === 'days' ? t('common.days') : t('common.weeks')}
      </span>
    </motion.button>
  );
}
