import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Card, ProgressBar, Segmented } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { useVybe, pickData } from '@/store/useVybe';
import { useT, type TKey } from '@/lib/i18n';
import { ACHIEVEMENTS, RARITY_BONUS, type AchievementDef, type Rarity } from '@/domain/achievements';
import { RARITY_STYLE } from './rarity';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { shareText } from '@/lib/share';
import { useReducedMotion } from '@/lib/motion';

type Filter = 'all' | Rarity;

export default function AchievementsScreen() {
  const { t } = useT();
  const state = useVybe();
  const unlocked = state.achievements;
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<AchievementDef | null>(null);
  const data = pickData(state);
  const progress = useMemo(() => Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a.progress(data)])), // eslint-disable-line react-hooks/exhaustive-deps
    [state.missions, state.habits, state.ledger, state.transactions, state.budgets, state.savings, state.chat]);
  const unlockedMap = new Map(unlocked.map((u) => [u.id, u.at]));
  const list = ACHIEVEMENTS.filter((a) => filter === 'all' || a.rarity === filter);
  const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

  return (
    <Page>
      <PageHeader title={t('a.title')} subtitle={`${unlocked.length}/${ACHIEVEMENTS.length} ${t('a.unlocked')}`} />
      <Card className="mb-6 flex flex-wrap items-center gap-6">
        <ProgressRing value={unlocked.length / ACHIEVEMENTS.length} size={88} stroke={8}>
          <span className="font-display text-lg font-bold num">{Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)}%</span>
        </ProgressRing>
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {rarities.map((r) => {
            const total = ACHIEVEMENTS.filter((a) => a.rarity === r).length;
            const got = ACHIEVEMENTS.filter((a) => a.rarity === r && unlockedMap.has(a.id)).length;
            return (
              <div key={r}>
                <Badge className={RARITY_STYLE[r].text}>{t(`rarity.${r}` as TKey)}</Badge>
                <div className="mt-1.5 font-display text-xl font-semibold num">{got}<span className="text-sm text-faint">/{total}</span></div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <Segmented label="rarity" value={filter} onChange={setFilter} className="min-w-[440px]" options={[{ value: 'all', label: t('common.all') }, ...rarities.map((r) => ({ value: r, label: t(`rarity.${r}` as TKey) }))]} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((a, i) => {
          const isUnlocked = unlockedMap.has(a.id);
          const p = progress[a.id];
          return (
            <motion.button
              key={a.id}
              initial={reduce ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              whileHover={reduce ? undefined : { y: -4 }}
              onClick={() => setSelected(a)}
              className={cn('card flex flex-col items-center rounded-3xl p-4 text-center', !isUnlocked && 'opacity-70')}
            >
              <span className={cn('grid h-16 w-16 place-items-center rounded-[22px] border', isUnlocked ? RARITY_STYLE[a.rarity].badge : 'border-line/10 bg-line/5 text-faint')}>
                <Icon name={isUnlocked ? a.icon : 'Lock'} size={26} strokeWidth={1.6} />
              </span>
              <span className="mt-3 line-clamp-1 text-sm font-semibold">{a.title[state.settings.lang]}</span>
              <span className="mt-0.5 text-[11px] text-muted">{t(`rarity.${a.rarity}` as TKey)}</span>
              {!isUnlocked && (
                <div className="mt-3 w-full">
                  <ProgressBar value={p.current / p.target} className="h-1.5" />
                  <div className="mt-1 text-[10px] text-faint num">{p.current}/{p.target}</div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
      <AchievementDetail def={selected} unlockedAt={selected ? unlockedMap.get(selected.id) : undefined} progress={selected ? progress[selected.id] : undefined} onClose={() => setSelected(null)} />
    </Page>
  );
}

function AchievementDetail({ def, unlockedAt, progress, onClose }: { def: AchievementDef | null; unlockedAt?: string; progress?: { current: number; target: number }; onClose: () => void }) {
  const { t, lang } = useT();
  const toast = useVybe((s) => s.toast);
  if (!def) return <Sheet open={false} onClose={onClose} title=""><div /></Sheet>;
  const share = async () => {
    const r = await shareText(t('a.shareText', { title: def.title[lang] }));
    if (r === 'copied') toast(t('a.copied'));
  };
  return (
    <Sheet open onClose={onClose} title={def.title[lang]} footer={unlockedAt ? <Button className="flex-1" icon="Share2" onClick={share}>{t('a.share')}</Button> : undefined}>
      <div className="flex flex-col items-center pb-4 text-center">
        <span className={cn('grid h-24 w-24 place-items-center rounded-[28px] border', unlockedAt ? RARITY_STYLE[def.rarity].badge : 'border-line/10 bg-line/5 text-faint')}>
          <Icon name={unlockedAt ? def.icon : 'Lock'} size={40} strokeWidth={1.5} />
        </span>
        <Badge className={cn('mt-4', RARITY_STYLE[def.rarity].text)}>{t(`rarity.${def.rarity}` as TKey)}</Badge>
        <p className="mt-3 text-muted">{def.desc[lang]}</p>
        <p className="mt-2 font-display text-sm font-semibold text-gradient">{t('a.bonus', { xp: RARITY_BONUS[def.rarity] })}</p>
        {unlockedAt ? (
          <p className="mt-4 text-sm text-success">{t('a.unlockedOn', { date: formatDate(unlockedAt.slice(0, 10), lang, { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>
        ) : progress && (
          <div className="mt-5 w-full max-w-xs">
            <ProgressBar value={progress.current / progress.target} />
            <p className="mt-2 text-xs text-muted num">{progress.current} / {progress.target}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
