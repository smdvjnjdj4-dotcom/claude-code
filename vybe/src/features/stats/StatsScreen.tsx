import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page, PageHeader } from '@/components/layout/Page';
import { Card, EmptyState, SectionHeader } from '@/components/ui/primitives';
import { ATTR_COLOR, ATTR_ICON, Icon } from '@/components/ui/Icon';
import { useVybe } from '@/store/useVybe';
import { useProgress } from '@/store/selectors';
import { useT, ledgerLabel } from '@/lib/i18n';
import { activeDays } from '@/domain/progression';
import { lastNDays } from '@/lib/date';
import { formatDate, formatNumber } from '@/lib/format';
import { axisProps, ChartTooltip } from '@/components/ui/chart';
import { achievementDef } from '@/domain/engine';
import { useReducedMotion } from '@/lib/motion';

export default function StatsScreen() {
  const { t, lang, attr } = useT();
  const ledger = useVybe((s) => s.ledger);
  const frozenDays = useVybe((s) => s.frozenDays);
  const missions = useVybe((s) => s.missions);
  const { level, best, attributes } = useProgress();
  const reduce = useReducedMotion();

  const xp14 = useMemo(() => lastNDays(14).map((d) => ({ day: formatDate(d, lang, { day: 'numeric', month: 'numeric' }), xp: ledger.filter((e) => e.date === d).reduce((s, e) => s + e.xp, 0) })), [ledger, lang]);
  const missionsDone = missions.reduce((s, m) => s + Object.keys(m.completed).length, 0);
  const active = activeDays({ ledger, frozenDays }).size;
  const maxAttr = Math.max(1, ...attributes.map((a) => a.xp));
  const history = useMemo(() => [...ledger].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60), [ledger]);

  const label = (key: string, l: string) => {
    if (key.startsWith('ach:')) return `${t('s.achievement')}: ${achievementDef(key.slice(4))?.title[lang] ?? ''}`;
    return ledgerLabel(l, lang);
  };

  return (
    <Page>
      <PageHeader title={t('s.title')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: 'Zap', label: t('s.totalXp'), value: formatNumber(level.totalXp, lang) },
          { icon: 'Flame', label: t('s.bestStreak'), value: `${best} ${t('common.days')}` },
          { icon: 'CalendarCheck', label: t('s.activeDays'), value: active },
          { icon: 'Target', label: t('s.missionsDone'), value: missionsDone },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Icon name={s.icon} size={14} className="text-accent" />{s.label}</div>
            <div className="mt-1 font-display text-2xl font-bold num">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionHeader title={t('s.xp14')} />
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={xp14} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeOpacity={0.06} />
                <XAxis dataKey="day" {...axisProps} interval={1} />
                <YAxis {...axisProps} width={44} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgb(var(--line) / 0.05)' }} content={<ChartTooltip format={(v) => `${v} XP`} />} />
                <Bar dataKey="xp" fill="rgb(var(--accent))" style={{ fill: 'rgb(var(--accent))' }} radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={reduce ? 0 : 900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionHeader title={t('s.byAttr')} />
          <ul className="space-y-3">
            {[...attributes].sort((a, b) => b.xp - a.xp).map((a) => (
              <li key={a.id} className="flex items-center gap-3 text-sm">
                <Icon name={ATTR_ICON[a.id]} size={16} className="shrink-0" />
                <span className="w-24 shrink-0 truncate text-muted">{attr(a.id)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/10">
                  <div className="h-full rounded-full bg-gradient-accent transition-all duration-700" style={{ width: `${(a.xp / maxAttr) * 100}%` }} />
                </div>
                <span className="w-14 text-right num">{formatNumber(a.xp, lang)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="mt-6">
        <SectionHeader title={t('s.history')} />
        {history.length === 0 ? (
          <Card><EmptyState icon="Activity" title={t('s.history')} text={t('s.empty')} /></Card>
        ) : (
          <Card className="divide-y divide-line/5 p-2">
            {history.map((e) => (
              <div key={e.key} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: e.attribute ? `rgb(${ATTR_COLOR[e.attribute]} / 0.14)` : 'rgb(var(--accent) / 0.14)', color: e.attribute ? `rgb(${ATTR_COLOR[e.attribute]})` : 'rgb(var(--accent))' }}>
                  <Icon name={e.key.startsWith('ach:') ? 'Trophy' : e.attribute ? ATTR_ICON[e.attribute] : 'Zap'} size={15} />
                </span>
                <span className="min-w-0 flex-1 truncate">{label(e.key, e.label)}</span>
                <span className="text-xs text-faint">{formatDate(e.date, lang)}</span>
                <span className="w-14 text-right font-display font-semibold text-accent num">+{e.xp}</span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </Page>
  );
}
