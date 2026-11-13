import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Card, EmptyState, IconButton, ProgressBar, SectionHeader } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useVybe } from '@/store/useVybe';
import { useT } from '@/lib/i18n';
import { navigate, useRoute } from '@/lib/router';
import { formatDate, formatMoney } from '@/lib/format';
import { monthKey, todayKey } from '@/lib/date';
import { budgetUsage, nextMonth, prevMonth, summarize } from './finance';
import { BudgetSheet, ContributeSheet, GoalSheet, TransactionSheet } from './MoneyForms';
import type { SavingsGoal } from '@/domain/types';
import { SERIES, SERIES_OTHER, ChartTooltip } from '@/components/ui/chart';
import { cn } from '@/lib/cn';

export default function MoneyScreen() {
  const { t, lang, cat } = useT();
  const { param } = useRoute();
  const txs = useVybe((s) => s.transactions);
  const budgets = useVybe((s) => s.budgets);
  const goals = useVybe((s) => s.savings);
  const del = useVybe((s) => s.deleteTransaction);
  const { baseCurrency: cur, hideAmounts: hide } = useVybe((s) => s.settings);
  const [month, setMonth] = useState(monthKey(todayKey()));
  const [txOpen, setTxOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [budgetOpen, setBudgetOpen] = useState<{ open: boolean; cat?: string }>({ open: false });
  const [goalOpen, setGoalOpen] = useState<{ open: boolean; goal?: SavingsGoal | null }>({ open: false });
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { if (param === 'new') { setTxType('expense'); setTxOpen(true); } }, [param]);

  const money = (v: number, c = cur) => formatMoney(v, c, lang, hide);
  const summary = useMemo(() => summarize(txs, month, cur), [txs, month, cur]);
  const last = useMemo(() => summarize(txs, prevMonth(month), cur), [txs, month, cur]);
  const usage = useMemo(() => budgetUsage(budgets, summary), [budgets, summary]);
  const monthTx = txs.filter((t) => monthKey(t.date) === month).sort((a, b) => b.date.localeCompare(a.date));

  // Donut: top 5 categories, the rest folded into "Other" — keeps the palette within its validated range.
  const donut = useMemo(() => {
    const top = summary.byCategory.slice(0, 5).map((c, i) => ({ name: cat(c.category), value: c.amount, color: SERIES[i] }));
    const rest = summary.byCategory.slice(5).reduce((s, c) => s + c.amount, 0);
    return rest > 0 ? [...top, { name: t('cat.other'), value: rest, color: SERIES_OTHER }] : top;
  }, [summary, cat, t]);

  const insights = useMemo(() => {
    const out: string[] = [];
    if (summary.byCategory[0]) out.push(t('f.ins.top', { cat: cat(summary.byCategory[0].category), amount: money(summary.byCategory[0].amount) }));
    if (summary.income > 0) out.push(t('f.ins.rate', { rate: Math.round((summary.balance / summary.income) * 100) }));
    if (last.expense > 0 && summary.expense > 0) {
      const pct = Math.round(((summary.expense - last.expense) / last.expense) * 100);
      out.push(t('f.ins.vsLast', { dir: pct >= 0 ? t('f.ins.up') : t('f.ins.down'), pct: Math.abs(pct) }));
    }
    const over = usage.filter((u) => u.pct > 1).length;
    if (over) out.push(t('f.ins.budget', { n: over }));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, last, usage, lang, hide]);

  const monthLabel = formatDate(`${month}-01`, lang, { month: 'long', year: 'numeric' });
  const isCurrent = month === monthKey(todayKey());

  return (
    <Page>
      <PageHeader title={t('f.title')} actions={<Button icon="Plus" aria-label={t('f.add')} onClick={() => { setTxType('expense'); setTxOpen(true); }}><span className="hidden sm:inline">{t('f.add')}</span></Button>} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <IconButton icon="ArrowLeft" label={t('f.month') + ' -1'} onClick={() => setMonth(prevMonth(month))} />
          <span className="min-w-[140px] text-center font-display font-semibold capitalize">{monthLabel}</span>
          <IconButton icon="ChevronRight" label={t('f.month') + ' +1'} onClick={() => setMonth(nextMonth(month))} disabled={isCurrent} className="disabled:opacity-30" />
        </div>
        <Badge><Icon name="PenLine" size={11} />{t('f.manual')}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Balance */}
        <Card className="glow-border relative overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full bg-accent2/15 blur-3xl" />
          <p className="text-sm text-muted">{t('f.balance')}</p>
          <div className={cn('mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl', summary.balance < 0 && 'text-danger')}>
            {hide ? money(0) : <AnimatedNumber value={summary.balance / 100} format={(n) => formatMoney(Math.round(n * 100), cur, lang)} />}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => { setTxType('income'); setTxOpen(true); }} className="rounded-2xl bg-success/10 p-4 text-left transition hover:bg-success/15">
              <span className="flex items-center gap-1.5 text-xs text-muted"><Icon name="Plus" size={13} className="text-success" />{t('f.income')}</span>
              <span className="mt-1 block font-display text-xl font-semibold num">{money(summary.income)}</span>
            </button>
            <button onClick={() => { setTxType('expense'); setTxOpen(true); }} className="rounded-2xl bg-danger/10 p-4 text-left transition hover:bg-danger/15">
              <span className="flex items-center gap-1.5 text-xs text-muted"><Icon name="Minus" size={13} className="text-danger" />{t('f.expense')}</span>
              <span className="mt-1 block font-display text-xl font-semibold num">{money(summary.expense)}</span>
            </button>
          </div>
          {summary.otherCurrencyCount > 0 && <p className="mt-3 text-xs text-warn">{t('f.otherCurrency', { n: summary.otherCurrencyCount })}</p>}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-faint"><Icon name="Shield" size={13} className="mt-px shrink-0" />{t('f.manualNote')}</p>
        </Card>

        {/* Distribution */}
        <Card>
          <SectionHeader title={t('f.distribution')} />
          {donut.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{t('f.ins.none')}</p>
          ) : (
            <>
              <div className="relative h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="94%" paddingAngle={0} stroke="rgb(var(--surface))" strokeWidth={2} startAngle={90} endAngle={-270} animationDuration={900}>
                      {donut.map((d) => <Cell key={d.name} fill={d.color} style={{ fill: d.color }} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip format={(v) => money(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div><div className="text-xs text-muted">{t('f.expense')}</div><div className="font-display font-semibold num">{money(summary.expense)}</div></div>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {donut.map((d) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="flex-1 truncate text-muted">{d.name}</span>
                    <span className="num">{money(d.value)}</span>
                    <span className="w-10 text-right text-xs text-faint num">{Math.round((d.value / summary.expense) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Insights */}
      <Card className="mt-4">
        <SectionHeader title={<span className="flex items-center gap-2"><Icon name="Lightbulb" size={16} className="text-accent" />{t('f.insights')}</span>} />
        {insights.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">{insights.map((i) => <li key={i} className="rounded-xl bg-line/[0.04] px-3.5 py-2.5 text-sm">{i}</li>)}</ul>
        ) : <p className="text-sm text-muted">{t('f.ins.none')}</p>}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Budgets */}
        <section>
          <SectionHeader title={t('f.budgets')} action={<Button size="sm" variant="ghost" icon="Plus" onClick={() => setBudgetOpen({ open: true })}>{t('common.add')}</Button>} />
          <Card className="space-y-4">
            {usage.length === 0 ? <p className="py-4 text-center text-sm text-muted">{t('f.noBudgets')}</p> : usage.map((u) => (
              <button key={u.category} className="block w-full text-left" onClick={() => setBudgetOpen({ open: true, cat: u.category })}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{cat(u.category)}</span>
                  <span className={cn('num', u.pct > 1 ? 'text-danger' : 'text-muted')}>
                    {money(u.spent)} / {money(u.limit)}
                  </span>
                </div>
                <ProgressBar value={u.pct} color={u.pct > 1 ? '244 63 94' : u.pct > 0.85 ? '251 191 36' : undefined} />
                <div className="mt-1 text-xs text-faint">
                  {u.pct > 1 ? <span className="text-danger">{money(u.spent - u.limit)} {t('f.over')}</span> : <>{money(u.limit - u.spent)} {t('f.left')}</>}
                </div>
              </button>
            ))}
          </Card>
        </section>

        {/* Savings goals */}
        <section>
          <SectionHeader title={t('f.goals')} action={<Button size="sm" variant="ghost" icon="Plus" onClick={() => setGoalOpen({ open: true, goal: null })}>{t('common.add')}</Button>} />
          {goals.length === 0 ? (
            <Card><EmptyState icon="PiggyBank" title={t('f.goals')} text={t('f.noGoals')} action={<Button size="sm" icon="Plus" onClick={() => setGoalOpen({ open: true, goal: null })}>{t('f.newGoal')}</Button>} /></Card>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => {
                const pct = g.target ? g.saved / g.target : 0;
                return (
                  <Card key={g.id} className="flex items-center gap-4 p-4">
                    <ProgressRing value={pct} size={64} stroke={6}><span className="text-xs font-bold num">{Math.round(pct * 100)}%</span></ProgressRing>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setGoalOpen({ open: true, goal: g })}>
                      <div className="truncate font-medium">{g.name}</div>
                      <div className="text-sm text-muted num">{money(g.saved, g.currency)} / {money(g.target, g.currency)}</div>
                      {g.deadline && <div className="text-xs text-faint">{t('f.deadline')}: {formatDate(g.deadline, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                    </button>
                    <Button size="sm" variant="secondary" icon="Plus" onClick={() => setContributeGoal(g)}>{t('f.deposit')}</Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Transactions */}
      <section className="mt-6">
        <SectionHeader title={t('f.transactions')} />
        {monthTx.length === 0 ? (
          <Card><EmptyState icon="Wallet" title={t('f.noTx')} text={t('f.noTxText')} action={<Button size="sm" icon="Plus" onClick={() => setTxOpen(true)}>{t('f.add')}</Button>} /></Card>
        ) : (
          <Card className="divide-y divide-line/5 p-2">
            <AnimatePresence initial={false}>
              {(showAll ? monthTx : monthTx.slice(0, 8)).map((tx) => (
                <motion.div key={tx.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-3 px-3 py-3">
                  <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tx.type === 'income' ? 'bg-success/12 text-success' : 'bg-line/5 text-muted')} style={tx.type === 'income' ? { background: 'rgb(var(--success) / 0.12)' } : undefined}>
                    <Icon name={tx.type === 'income' ? 'Plus' : 'Minus'} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{tx.note || cat(tx.category)}</div>
                    <div className="flex items-center gap-2 text-xs text-faint">
                      {formatDate(tx.date, lang)} · {cat(tx.category)}
                      <Badge tone={tx.source === 'demo' ? 'warn' : 'default'}>{tx.source === 'demo' ? t('f.demoData') : tx.source === 'connected' ? t('f.connected') : t('f.manual')}</Badge>
                    </div>
                  </div>
                  <span className={cn('font-display text-sm font-semibold num', tx.type === 'income' && 'text-success')}>{tx.type === 'income' ? '+' : '−'}{money(tx.amount, tx.currency)}</span>
                  <IconButton icon="Trash2" label={t('common.delete')} onClick={() => del(tx.id)} className="h-8 w-8 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" />
                </motion.div>
              ))}
            </AnimatePresence>
            {monthTx.length > 8 && <button className="w-full py-3 text-sm text-accent" onClick={() => setShowAll(!showAll)}>{showAll ? t('common.close') : t('common.seeAll')} ({monthTx.length})</button>}
          </Card>
        )}
      </section>

      <TransactionSheet open={txOpen} initialType={txType} onClose={() => { setTxOpen(false); if (param) navigate('money'); }} />
      <BudgetSheet open={budgetOpen.open} category={budgetOpen.cat} onClose={() => setBudgetOpen({ open: false })} />
      <GoalSheet open={goalOpen.open} goal={goalOpen.goal} onClose={() => setGoalOpen({ open: false })} />
      <ContributeSheet goal={contributeGoal} onClose={() => setContributeGoal(null)} />
    </Page>
  );
}
