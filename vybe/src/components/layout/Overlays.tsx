import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useVybe } from '@/store/useVybe';
import { useT, ledgerLabel, type TKey } from '@/lib/i18n';
import { Icon } from '@/components/ui/Icon';
import { Button, Badge } from '@/components/ui/primitives';
import { useReducedMotion } from '@/lib/motion';
import { RARITY_BONUS } from '@/domain/achievements';
import { ParticleBurst } from '@/components/ui/Particles';
import { levelTitle } from '@/domain/progression';
import { RARITY_STYLE } from '@/features/achievements/rarity';
import { cn } from '@/lib/cn';

/** Floating "+XP" chips after a reward. */
export function RewardLayer() {
  const rewards = useVybe((s) => s.rewards);
  const dismiss = useVybe((s) => s.dismissReward);
  const lang = useVybe((s) => s.settings.lang);
  useEffect(() => {
    if (!rewards.length) return;
    const timers = rewards.map((r) => setTimeout(() => dismiss(r.id), 2200));
    return () => timers.forEach(clearTimeout);
  }, [rewards, dismiss]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2" aria-live="polite">
      <AnimatePresence>
        {rewards.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="glass flex items-center gap-2 rounded-full px-4 py-2 shadow-glow"
          >
            <Icon name="Zap" size={16} className="text-accent" />
            <span className="font-display text-sm font-bold text-gradient num">+{r.xp} XP</span>
            <span className="max-w-[180px] truncate text-xs text-muted">{ledgerLabel(r.label, lang)}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Toasts() {
  const toasts = useVybe((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm shadow-card">
            <Icon name={t.tone === 'err' ? 'X' : t.tone === 'info' ? 'Sparkles' : 'Check'} size={16} className={t.tone === 'err' ? 'text-danger' : 'text-success'} />
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Achievement reveal + level-up celebration (queued, one at a time). */
export function Celebrations() {
  const queue = useVybe((s) => s.unlockQueue);
  const shift = useVybe((s) => s.shiftUnlock);
  const levelUp = useVybe((s) => s.levelUp);
  const clearLevelUp = useVybe((s) => s.clearLevelUp);
  const { t, lang } = useT();
  const reduce = useReducedMotion();
  const current = queue[0];
  const showLevel = !current && levelUp !== null;
  return (
    <AnimatePresence>
      {(current || showLevel) && (
        <motion.div key={current?.id ?? `lvl${levelUp}`} className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-6 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={current ? t('a.new') : t('lvl.up')}>
          <motion.div
            initial={reduce ? { opacity: 0 } : { scale: 0.7, opacity: 0, rotateX: 25 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="card glow-border relative w-full max-w-sm overflow-hidden p-8 text-center"
          >
            <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
            {current ? (
              <>
                <div className="relative mx-auto mb-5 h-28 w-28">
                  {!reduce && <ParticleBurst count={22} />}
                  <motion.div
                    initial={reduce ? false : { rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.1 }}
                    className={cn('grid h-28 w-28 place-items-center rounded-[32px] border', RARITY_STYLE[current.rarity].badge)}
                  >
                    <Icon name={current.icon} size={44} strokeWidth={1.6} />
                  </motion.div>
                </div>
                <Badge className={RARITY_STYLE[current.rarity].text}>{t(`rarity.${current.rarity}` as TKey)}</Badge>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">{t('a.new')}</p>
                <h2 className="mt-1 font-display text-2xl font-bold">{current.title[lang]}</h2>
                <p className="mt-2 text-sm text-muted">{current.desc[lang]}</p>
                <p className="mt-3 font-display text-sm font-semibold text-gradient">{t('a.bonus', { xp: RARITY_BONUS[current.rarity] })}</p>
                <Button className="mt-6 w-full" onClick={shift}>{t('lvl.continue')}</Button>
              </>
            ) : (
              <>
                <div className="relative mx-auto mb-4 grid h-28 w-28 place-items-center">
                  {!reduce && <ParticleBurst count={26} />}
                  <motion.div initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }} className="font-display text-6xl font-bold text-gradient num">
                    {levelUp}
                  </motion.div>
                </div>
                <h2 className="font-display text-2xl font-bold">{t('lvl.up')}</h2>
                <p className="mt-2 text-sm text-muted">{t('lvl.reached', { level: levelUp ?? 0 })} · {levelTitle(levelUp ?? 1, lang)}</p>
                <Button className="mt-6 w-full" onClick={clearLevelUp}>{t('lvl.continue')}</Button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
