import { motion } from 'framer-motion';
import { Page, PageHeader } from '@/components/layout/Page';
import { Icon } from '@/components/ui/Icon';
import { SECONDARY } from '@/components/layout/Navigation';
import { navigate } from '@/lib/router';
import { useT } from '@/lib/i18n';
import { useVybe } from '@/store/useVybe';
import { useProgress } from '@/store/selectors';
import { Avatar } from '@/components/ui/Avatar';
import { levelTitle } from '@/domain/progression';
import { useReducedMotion } from '@/lib/motion';

export default function MoreScreen() {
  const { t, lang } = useT();
  const profile = useVybe((s) => s.profile)!;
  const { level } = useProgress();
  const reduce = useReducedMotion();
  return (
    <Page>
      <PageHeader title={t('nav.more')} />
      <button onClick={() => navigate('character')} className="card mb-5 flex w-full items-center gap-4 rounded-3xl p-4 text-left">
        <Avatar name={profile.name} size={56} level={level.level} />
        <div className="flex-1">
          <div className="font-display text-lg font-semibold">{profile.name}</div>
          <div className="text-sm text-muted">{levelTitle(level.level, lang)} · {t('common.level')} {level.level}</div>
        </div>
        <Icon name="ChevronRight" className="text-faint" />
      </button>
      <div className="grid grid-cols-2 gap-3">
        {SECONDARY.map((s, i) => (
          <motion.button key={s.route} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileTap={reduce ? undefined : { scale: 0.97 }}
            onClick={() => navigate(s.route)} className="card flex flex-col items-start gap-4 rounded-3xl p-5 text-left">
            <span className="grid h-11 w-11 place-items-center rounded-2xl text-accent" style={{ background: 'rgb(var(--accent) / 0.12)' }}><Icon name={s.icon} size={21} /></span>
            <span className="font-medium">{t(s.label)}</span>
          </motion.button>
        ))}
      </div>
    </Page>
  );
}
