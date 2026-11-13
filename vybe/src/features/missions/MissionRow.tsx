import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Mission } from '@/domain/types';
import { useVybe } from '@/store/useVybe';
import { isMissionDone, missionProgress } from '@/domain/engine';
import { MISSION_XP } from '@/domain/progression';
import { todayKey } from '@/lib/date';
import { useT } from '@/lib/i18n';
import { ATTR_COLOR, ATTR_ICON, Icon } from '@/components/ui/Icon';
import { ParticleBurst } from '@/components/ui/Particles';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

export function MissionRow({ mission, onEdit }: { mission: Mission; onEdit?: () => void }) {
  const today = todayKey();
  const done = isMissionDone(mission, today);
  const progress = missionProgress(mission, today);
  const toggle = useVybe((s) => s.toggleMission);
  const step = useVybe((s) => s.stepMission);
  const { t, attr, lang } = useT();
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const color = ATTR_COLOR[mission.attribute];
  const multi = mission.target > 1;
  const carried = mission.recurrence === 'once' && !done && mission.date && mission.date < today;

  const onCheck = () => {
    if (!done) setBurst((b) => b + 1);
    if (multi && !done) step(mission.id, 1);
    else toggle(mission.id);
  };

  return (
    <motion.li layout={!reduce} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className={cn('group card flex items-center gap-3.5 rounded-2xl p-3.5 pr-2', done && 'opacity-60')}>
      <button
        onClick={onCheck}
        aria-label={`${mission.title}: ${done ? t('common.undo') : multi ? '+1' : t('m.completed')}`}
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full"
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden>
          <circle cx="22" cy="22" r="19" fill="none" stroke="rgb(var(--line))" strokeOpacity="0.12" strokeWidth="2.5" />
          <motion.circle cx="22" cy="22" r="19" fill="none" stroke={`rgb(${color})`} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={119.4}
            animate={{ strokeDashoffset: 119.4 * (1 - (done ? 1 : progress / mission.target)) }} transition={{ duration: 0.5 }} />
        </svg>
        <AnimatePresence>
          {done ? (
            <motion.span key="d" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: `rgb(${color})` }}>
              <Icon name="Check" size={17} strokeWidth={3} />
            </motion.span>
          ) : multi ? (
            <span className="text-[11px] font-semibold num text-muted">{progress}/{mission.target}</span>
          ) : null}
        </AnimatePresence>
        {burst > 0 && !reduce && <ParticleBurst key={burst} color={color} />}
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={onEdit} disabled={!onEdit}>
        <div className={cn('truncate text-[15px] font-medium', done && 'line-through decoration-faint')}>{mission.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1" style={{ color: `rgb(${color})` }}><Icon name={ATTR_ICON[mission.attribute]} size={13} />{attr(mission.attribute)}</span>
          <span className="text-faint">·</span>
          <span>{mission.recurrence === 'daily' ? t('m.daily') : t('m.once')}</span>
          {carried && <span className="text-warn">{t('m.carry', { date: formatDate(mission.date!, lang) })}</span>}
          {mission.source === 'ai' && <span className="text-accent">{t('m.ai')}</span>}
        </div>
      </button>
      {multi && !done && progress > 0 && (
        <button onClick={() => step(mission.id, -1)} aria-label="-1" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-line/5 hover:text-fg"><Icon name="Minus" size={15} /></button>
      )}
      <span className={cn('shrink-0 rounded-xl px-2.5 py-1 font-display text-xs font-bold num', done ? 'text-faint' : 'bg-accent/10 text-accent')}>+{MISSION_XP[mission.difficulty]}</span>
    </motion.li>
  );
}
