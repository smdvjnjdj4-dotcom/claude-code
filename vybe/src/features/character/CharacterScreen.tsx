import { motion } from 'framer-motion';
import { useState } from 'react';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Card, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { ATTR_COLOR, ATTR_ICON, Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useVybe } from '@/store/useVybe';
import { useProgress } from '@/store/selectors';
import { useT, type TKey } from '@/lib/i18n';
import { AURAS, levelTitle, LEVEL_TITLES } from '@/domain/progression';
import { formatNumber } from '@/lib/format';
import { navigate } from '@/lib/router';
import { ChartTooltip } from '@/components/ui/chart';
import { cn } from '@/lib/cn';
import type { AccentTheme, Attribute } from '@/domain/types';
import { useReducedMotion } from '@/lib/motion';

const AURA_PREVIEW: Record<string, [string, string]> = {
  violet: ['139 92 246', '34 211 238'], cyan: ['34 211 238', '139 92 246'], aurora: ['52 211 153', '34 211 238'], solar: ['251 146 60', '250 204 21'], nebula: ['236 72 153', '139 92 246'],
};

export default function CharacterScreen() {
  const { t, lang, attr } = useT();
  const profile = useVybe((s) => s.profile)!;
  const accent = useVybe((s) => s.settings.accent);
  const updateSettings = useVybe((s) => s.updateSettings);
  const achievements = useVybe((s) => s.achievements.length);
  const { level, attributes, streak, best } = useProgress();
  const reduce = useReducedMotion();
  const [focus, setFocus] = useState<Attribute | null>(null);

  // Radar plots attribute rank (level + progress), so it grows visibly with every action.
  const maxRank = Math.max(5, ...attributes.map((a) => a.level + a.pct));
  const radar = attributes.map((a) => ({ attr: attr(a.id), value: +(a.level - 1 + a.pct).toFixed(2), full: maxRank }));
  const nextTitle = LEVEL_TITLES.find((x) => x.min > level.level);

  return (
    <Page>
      <PageHeader title={t('c.title')} />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="glow-border relative overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative flex flex-col items-center text-center">
            <ProgressRing value={level.pct} size={168} stroke={8}>
              <Avatar name={profile.name} size={112} />
            </ProgressRing>
            <h2 className="mt-4 font-display text-2xl font-bold">{profile.name}</h2>
            <p className="text-sm text-gradient font-semibold">{levelTitle(level.level, lang)}</p>
            <div className="mt-4 grid w-full grid-cols-3 gap-2">
              <MiniStat label={t('common.level')} value={<AnimatedNumber value={level.level} />} />
              <MiniStat label={t('common.xp')} value={<AnimatedNumber value={level.totalXp} format={(n) => formatNumber(n, lang)} />} />
              <MiniStat label={t('home.streak')} value={streak} />
            </div>
            <div className="mt-4 w-full">
              <ProgressBar value={level.pct} />
              <p className="mt-2 text-xs text-muted num">{t('home.toNext', { xp: formatNumber(level.needed - level.intoLevel, lang), level: level.level + 1 })}</p>
              {nextTitle && <p className="mt-1 text-xs text-faint">{nextTitle[lang]} · {t('c.unlockAt', { level: nextTitle.min })}</p>}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => navigate('achievements')} className="rounded-xl bg-line/5 px-3 py-2 text-xs text-muted hover:text-fg"><Icon name="Trophy" size={13} className="mr-1 inline text-warn" />{achievements} {t('a.unlocked')}</button>
              <button onClick={() => navigate('stats')} className="rounded-xl bg-line/5 px-3 py-2 text-xs text-muted hover:text-fg"><Icon name="Flame" size={13} className="mr-1 inline text-warn" />{t('h.best')}: {best}</button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <SectionHeader title={t('c.attributes')} />
          <div className="h-72" role="img" aria-label={attributes.map((a) => `${attr(a.id)} ${t('c.rank')} ${a.level}`).join(', ')}>
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="72%">
                <defs>
                  <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="rgb(var(--accent2))" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <PolarGrid stroke="rgb(var(--line))" strokeOpacity={0.1} />
                <PolarAngleAxis dataKey="attr" tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }} />
                <Radar dataKey="full" stroke="none" fill="transparent" isAnimationActive={false} />
                <Radar dataKey="value" name={t('c.rank')} stroke="rgb(var(--accent))" strokeWidth={2} fill="url(#radarFill)" dot={{ r: 3, fill: 'rgb(var(--accent2))', strokeWidth: 0 }} animationDuration={reduce ? 0 : 1100} />
                <Tooltip content={<ChartTooltip format={(v) => `${t('c.rank')} ${(Math.floor(v) + 1)}`} />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attributes.map((a, i) => {
          const c = ATTR_COLOR[a.id];
          return (
            <motion.button
              key={a.id}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={reduce ? undefined : { y: -3 }}
              onClick={() => setFocus(focus === a.id ? null : a.id)}
              aria-expanded={focus === a.id}
              className="card rounded-3xl p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `rgb(${c} / 0.14)`, color: `rgb(${c})` }}><Icon name={ATTR_ICON[a.id]} size={21} /></span>
                <div className="flex-1">
                  <div className="font-medium">{attr(a.id)}</div>
                  <div className="text-xs text-muted num">{formatNumber(a.xp, lang)} XP</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-faint">{t('c.rank')}</div>
                  <div className="font-display text-2xl font-bold num" style={{ color: `rgb(${c})` }}>{a.level}</div>
                </div>
              </div>
              <ProgressBar value={a.pct} color={c} className="mt-3" />
              <div className="mt-1.5 text-right text-[11px] text-faint num">{a.intoLevel}/{a.needed}</div>
              {focus === a.id && <p className="mt-2 border-t hairline pt-2 text-xs text-muted"><b className="text-fg">{t('c.howTo', { attr: attr(a.id) })}.</b> {t('c.howToText')}</p>}
            </motion.button>
          );
        })}
      </div>

      <section className="mt-8">
        <SectionHeader title={t('c.auras')} />
        <p className="-mt-2 mb-4 text-sm text-muted">{t('c.aurasHint')}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {AURAS.map((au) => {
            const unlocked = level.level >= au.level;
            const active = accent === au.id;
            const [a1, a2] = AURA_PREVIEW[au.id];
            return (
              <button
                key={au.id}
                disabled={!unlocked}
                onClick={() => updateSettings({ accent: au.id as AccentTheme })}
                aria-pressed={active}
                className={cn('card relative flex flex-col items-center gap-3 rounded-3xl p-4 transition', active && 'shadow-glow', !unlocked && 'opacity-50')}
                style={active ? { borderColor: `rgb(${a1} / 0.6)` } : undefined}
              >
                <span className="relative h-14 w-14 rounded-full" style={{ background: `conic-gradient(rgb(${a1}), rgb(${a2}), rgb(${a1}))`, boxShadow: unlocked ? `0 0 24px -4px rgb(${a1} / 0.7)` : undefined }}>
                  <span className="absolute inset-[5px] grid place-items-center rounded-full bg-surface">{!unlocked && <Icon name="Lock" size={16} className="text-faint" />}</span>
                </span>
                <span className="text-sm font-medium">{t(`aura.${au.id}` as TKey)}</span>
                {active ? <Badge tone="accent">{t('c.active')}</Badge> : !unlocked ? <span className="text-[11px] text-faint">{t('c.unlockAt', { level: au.level })}</span> : <span className="h-[18px]" />}
              </button>
            );
          })}
        </div>
      </section>
    </Page>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-line/[0.04] py-2.5">
      <div className="font-display text-lg font-bold num">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
