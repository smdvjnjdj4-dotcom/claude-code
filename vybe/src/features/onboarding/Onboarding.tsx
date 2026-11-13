import logo from '@/assets/icon.svg';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';
import { useVybe } from '@/store/useVybe';
import { useT, type TKey } from '@/lib/i18n';
import { Button, Chip, Input, ProgressBar, Segmented } from '@/components/ui/primitives';
import { ATTR_COLOR, ATTR_ICON, Icon } from '@/components/ui/Icon';
import { ATTRIBUTES, type Attribute } from '@/domain/types';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { navigate } from '@/lib/router';

const GOAL_KEYS: TKey[] = ['goal.s1', 'goal.s2', 'goal.s3', 'goal.s4', 'goal.s5', 'goal.s6', 'goal.s7', 'goal.s8'];
const MOTIVATIONS = ['growth', 'health', 'freedom', 'recognition', 'curiosity', 'people', 'competition', 'calm'];
const TIMES = [15, 30, 60, 120];
const STEPS = 5;

export function Onboarding() {
  const { t, lang } = useT();
  const reduce = useReducedMotion();
  const updateSettings = useVybe((s) => s.updateSettings);
  const complete = useVybe((s) => s.completeOnboarding);
  const startDemo = useVybe((s) => s.startDemo);
  const missionsCount = useVybe((s) => s.missions.length);
  const habitsCount = useVybe((s) => s.habits.length);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [areas, setAreas] = useState<Attribute[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [motivations, setMotivations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const go = (n: number) => {
    setError(null);
    setDir(n > step ? 1 : -1);
    setStep(n);
  };
  const next = () => {
    if (step === 1 && (!name.trim() || name.trim().length > 30)) return setError(t('ob.err.name'));
    if (step === 3 && areas.length === 0) return setError(t('ob.err.areas'));
    if (step === STEPS) {
      complete({ name: name.trim(), goals, focusAreas: areas, dailyMinutes: minutes, motivations });
      setFinished(true);
      return go(STEPS + 1);
    }
    go(step + 1);
  };
  const toggle = <T,>(list: T[], v: T, max = 99) => (list.includes(v) ? list.filter((x) => x !== v) : list.length < max ? [...list, v] : list);
  const addCustom = (e?: FormEvent) => {
    e?.preventDefault();
    const g = customGoal.trim();
    if (g.length >= 2 && g.length <= 60 && goals.length < 5 && !goals.includes(g)) setGoals([...goals, g]);
    setCustomGoal('');
  };

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 40, filter: 'blur(6px)' }),
    center: { opacity: 1, x: 0, filter: 'blur(0px)' },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -40, filter: 'blur(6px)' }),
  };

  return (
    <div className="safe-top flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-8 pt-6">
        <div className="flex h-10 items-center justify-between gap-4">
          {step > 0 && step <= STEPS ? (
            <>
              <button className="text-sm text-muted hover:text-fg" onClick={() => go(step - 1)}>{t('common.back')}</button>
              <div className="flex-1">
                <ProgressBar value={step / STEPS} />
                <span className="sr-only">{t('ob.step')} {step} / {STEPS}</span>
              </div>
              <span className="w-10 text-right text-xs text-faint num">{step}/{STEPS}</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2 font-display text-lg font-bold"><img src={logo} alt="" className="h-7 w-7 rounded-lg" />VYBE</span>
              {step === 0 && (
                <Segmented label="lang" value={lang} onChange={(v) => updateSettings({ lang: v })} options={[{ value: 'de', label: 'DE' }, { value: 'en', label: 'EN' }]} className="w-28" />
              )}
            </>
          )}
        </div>

        <div className="relative flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="py-8">
              {step === 0 && (
                <div className="text-center">
                  <motion.div initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }} className="relative mx-auto mb-10 h-40 w-40">
                    <div className="absolute inset-0 rounded-full bg-accent/30 blur-3xl" />
                    <motion.div className="absolute inset-0 rounded-full border border-accent/30" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
                      <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-accent2 shadow-[0_0_12px_rgb(var(--accent2))]" />
                    </motion.div>
                    <motion.div className="absolute inset-6 rounded-full border border-accent2/25" animate={reduce ? undefined : { rotate: -360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}>
                      <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_rgb(var(--accent))]" />
                    </motion.div>
                    <img src={logo} alt="" className="absolute inset-12 rounded-2xl" />
                  </motion.div>
                  <p className="mb-3 text-xs uppercase tracking-[0.3em] text-muted">{t('app.tagline')}</p>
                  <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{t('ob.welcome.title')}</h1>
                  <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted">{t('ob.welcome.text')}</p>
                </div>
              )}
              {step === 1 && (
                <Question title={t('ob.name.title')} hint={t('ob.name.hint')}>
                  <form onSubmit={(e) => { e.preventDefault(); next(); }}>
                    <Input autoFocus value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder={t('ob.name.placeholder')} className="h-14 text-lg" aria-label={t('ob.name.title')} />
                  </form>
                </Question>
              )}
              {step === 2 && (
                <Question title={t('ob.goals.title')} hint={t('ob.goals.hint')}>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_KEYS.map((k) => (
                      <Chip key={k} selected={goals.includes(t(k))} onClick={() => setGoals(toggle(goals, t(k), 5))}>{t(k)}</Chip>
                    ))}
                    {goals.filter((g) => !GOAL_KEYS.map((k) => t(k)).includes(g)).map((g) => (
                      <Chip key={g} selected onClick={() => setGoals(goals.filter((x) => x !== g))}>{g}</Chip>
                    ))}
                  </div>
                  <form onSubmit={addCustom} className="mt-4 flex gap-2">
                    <Input value={customGoal} maxLength={60} onChange={(e) => setCustomGoal(e.target.value)} placeholder={t('ob.goals.placeholder')} aria-label={t('ob.goals.placeholder')} />
                    <Button type="submit" variant="secondary" size="icon" icon="Plus" aria-label={t('common.add')} disabled={goals.length >= 5} />
                  </form>
                </Question>
              )}
              {step === 3 && (
                <Question title={t('ob.areas.title')} hint={t('ob.areas.hint')}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {ATTRIBUTES.map((a) => {
                      const sel = areas.includes(a);
                      return (
                        <motion.button
                          key={a}
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          aria-pressed={sel}
                          onClick={() => setAreas(toggle(areas, a))}
                          className={cn('card flex flex-col items-start gap-3 rounded-2xl p-4 text-left transition-all', sel && 'border-accent/50 shadow-glow')}
                          style={sel ? { borderColor: `rgb(${ATTR_COLOR[a]} / 0.6)` } : undefined}
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `rgb(${ATTR_COLOR[a]} / 0.15)`, color: `rgb(${ATTR_COLOR[a]})` }}>
                            <Icon name={ATTR_ICON[a]} size={20} />
                          </span>
                          <span className="flex w-full items-center justify-between text-sm font-medium">
                            {t(`attr.${a}` as TKey)}
                            {sel && <Icon name="Check" size={16} className="text-accent" />}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </Question>
              )}
              {step === 4 && (
                <Question title={t('ob.time.title')} hint={t('ob.time.hint')}>
                  <div className="grid grid-cols-2 gap-3">
                    {TIMES.map((m) => (
                      <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={cn('card rounded-2xl p-5 text-left transition-all', minutes === m && 'border-accent/60 shadow-glow')}>
                        <span className="font-display text-3xl font-bold num">{m}</span>
                        <span className="ml-1 text-sm text-muted">{t('ob.min')}</span>
                      </button>
                    ))}
                  </div>
                </Question>
              )}
              {step === 5 && (
                <Question title={t('ob.motivation.title')} hint={t('ob.motivation.hint')}>
                  <div className="flex flex-wrap gap-2">
                    {MOTIVATIONS.map((m) => (
                      <Chip key={m} selected={motivations.includes(m)} onClick={() => setMotivations(toggle(motivations, m))}>{t(`mot.${m}` as TKey)}</Chip>
                    ))}
                  </div>
                </Question>
              )}
              {step === STEPS + 1 && finished && (
                <div className="text-center">
                  <motion.div initial={reduce ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }} className="mx-auto mb-8 grid h-24 w-24 place-items-center rounded-[28px] bg-gradient-accent text-white shadow-glow">
                    <Icon name="Sparkles" size={40} />
                  </motion.div>
                  <h1 className="font-display text-3xl font-bold">{t('ob.finish.title')}</h1>
                  <p className="mx-auto mt-3 max-w-sm text-muted">{t('ob.finish.text', { missions: missionsCount, habits: habitsCount })}</p>
                </div>
              )}
              {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          {step === 0 && (
            <>
              <Button size="lg" className="w-full" onClick={() => go(1)}>{t('ob.start')}</Button>
              <Button size="lg" variant="ghost" className="w-full" onClick={() => { startDemo(); navigate('home'); }}>{t('ob.demo')}</Button>
            </>
          )}
          {step > 0 && step <= STEPS && (
            <Button size="lg" className="w-full" onClick={next}>{step === STEPS ? t('common.done') : t('common.next')}</Button>
          )}
          {step === STEPS + 1 && (
            // Onboarding state is already persisted; this simply reveals the dashboard.
            <Button size="lg" className="w-full" onClick={() => { useVybe.setState({ justOnboarded: false }); navigate('home'); }}>{t('ob.finish.cta')}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Question({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">{title}</h1>
      <p className="mb-7 mt-2 text-muted">{hint}</p>
      {children}
    </div>
  );
}
