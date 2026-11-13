import { AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Page, PageHeader } from '@/components/layout/Page';
import { Button, Card, EmptyState, Segmented } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useVybe } from '@/store/useVybe';
import { useT } from '@/lib/i18n';
import { navigate, useRoute } from '@/lib/router';
import { MissionRow } from './MissionRow';
import { MissionEditor } from './MissionEditor';
import type { Mission } from '@/domain/types';
import { isMissionDone, isMissionVisibleOn } from '@/domain/engine';
import { todayKey } from '@/lib/date';
import { ProgressRing } from '@/components/ui/ProgressRing';

type Filter = 'open' | 'done' | 'all';

export default function MissionsScreen() {
  const { t } = useT();
  const { param } = useRoute();
  const missions = useVybe((s) => s.missions);
  const [filter, setFilter] = useState<Filter>('open');
  const [editing, setEditing] = useState<Mission | null>(null);
  const [open, setOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (param === 'new') {
      setEditing(null);
      setOpen(true);
    }
  }, [param]);

  const today = todayKey();
  const { visible, done, all } = useMemo(() => {
    const visibleToday = missions.filter((m) => isMissionVisibleOn(m, today));
    const doneList = visibleToday.filter((m) => isMissionDone(m, today));
    return { visible: visibleToday, done: doneList.length, all: missions.filter((m) => !m.archived) };
  }, [missions, today]);

  const list = filter === 'open' ? visible.filter((m) => !isMissionDone(m, today)) : filter === 'done' ? visible.filter((m) => isMissionDone(m, today)) : all;

  const close = () => {
    setOpen(false);
    if (param) navigate('missions');
  };

  return (
    <Page>
      <PageHeader
        title={t('m.title')}
        subtitle={`${done}/${visible.length} ${t('common.today').toLowerCase()}`}
        actions={<Button icon="Plus" aria-label={t('m.new')} onClick={() => { setEditing(null); setOpen(true); }}><span className="hidden sm:inline">{t('m.new')}</span></Button>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Segmented label="filter" value={filter} onChange={setFilter} className="mb-4" options={[
            { value: 'open', label: t('m.filter.open') },
            { value: 'done', label: t('m.filter.done') },
            { value: 'all', label: t('common.all') },
          ]} />
          {list.length === 0 ? (
            <Card><EmptyState icon={filter === 'done' ? 'Trophy' : 'Target'} title={filter === 'open' && visible.length ? t('home.allDone') : t('m.empty')} text={t('m.emptyText')} action={<Button size="sm" icon="Plus" onClick={() => setOpen(true)}>{t('m.new')}</Button>} /></Card>
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {list.map((m) => <MissionRow key={m.id} mission={m} onEdit={() => { setEditing(m); setOpen(true); }} />)}
              </AnimatePresence>
            </ul>
          )}
        </div>
        <aside className="space-y-4">
          <Card className="flex items-center gap-4">
            <ProgressRing value={visible.length ? done / visible.length : 0} size={72} stroke={7}>
              <span className="font-display text-sm font-bold num">{done}/{visible.length}</span>
            </ProgressRing>
            <div>
              <div className="font-display font-semibold">{t('common.today')}</div>
              <div className="text-sm text-muted">{t('m.completed')}</div>
            </div>
          </Card>
          <Card>
            <button className="flex w-full items-center justify-between text-left" onClick={() => setShowRules(!showRules)} aria-expanded={showRules}>
              <span className="flex items-center gap-2 font-display font-semibold"><Icon name="Zap" size={16} className="text-accent" />{t('m.rules')}</span>
              <Icon name="ChevronRight" size={16} className={showRules ? 'rotate-90 transition' : 'transition'} />
            </button>
            {showRules && <p className="mt-3 text-sm leading-relaxed text-muted">{t('m.rulesText')}</p>}
          </Card>
        </aside>
      </div>
      <MissionEditor open={open} onClose={close} mission={editing} />
    </Page>
  );
}
