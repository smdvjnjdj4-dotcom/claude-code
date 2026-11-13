import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button, Chip, Field, Input, Segmented } from '@/components/ui/primitives';
import { useT } from '@/lib/i18n';
import { useVybe } from '@/store/useVybe';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/domain/content';
import { CURRENCIES, formatMoney, parseAmount } from '@/lib/format';
import { todayKey } from '@/lib/date';
import type { SavingsGoal, TxType } from '@/domain/types';
import { uid } from '@/lib/id';

export function TransactionSheet({ open, onClose, initialType = 'expense' }: { open: boolean; onClose: () => void; initialType?: TxType }) {
  const { t, cat } = useT();
  const add = useVybe((s) => s.addTransaction);
  const toast = useVybe((s) => s.toast);
  const base = useVybe((s) => s.settings.baseCurrency);
  const [type, setType] = useState<TxType>(initialType);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(base);
  const [category, setCategory] = useState<string>('food');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(initialType); setAmount(''); setCurrency(base); setCategory(initialType === 'income' ? 'salary' : 'food'); setDate(todayKey()); setNote(''); setError(null);
  }, [open, initialType, base]);

  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const submit = () => {
    const minor = parseAmount(amount);
    if (minor === null) return setError(t('f.err.amount'));
    add({ type, amount: minor, currency, category, note: note.trim() || undefined, date: date > todayKey() ? todayKey() : date, source: 'manual' });
    toast(t('f.saved'));
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('f.add')} footer={<><Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button><Button className="flex-1" onClick={submit}>{t('common.save')}</Button></>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Segmented label="txtype" value={type} onChange={(v) => { setType(v); setCategory(v === 'income' ? 'salary' : 'food'); }} options={[{ value: 'expense', label: t('f.addExpense') }, { value: 'income', label: t('f.addIncome') }]} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label={t('f.amount')} error={error}>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="font-display text-2xl" aria-invalid={!!error} />
            </Field>
          </div>
          <Field label={t('f.currency')}>
            <select className="input h-[58px]" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <span className="label">{t('f.category')}</span>
          <div className="flex flex-wrap gap-2">{cats.map((c) => <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{cat(c)}</Chip>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('f.date')}><Input type="date" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value || todayKey())} /></Field>
          <Field label={`${t('f.note')} (${t('common.optional')})`}><Input value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

export function BudgetSheet({ open, onClose, category: initialCat }: { open: boolean; onClose: () => void; category?: string }) {
  const { t, cat, lang } = useT();
  const budgets = useVybe((s) => s.budgets);
  const setBudget = useVybe((s) => s.setBudget);
  const removeBudget = useVybe((s) => s.removeBudget);
  const base = useVybe((s) => s.settings.baseCurrency);
  const [category, setCategory] = useState<string>('food');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const c = initialCat ?? 'food';
    setCategory(c);
    const b = budgets.find((x) => x.category === c);
    setLimit(b ? String(b.limit / 100).replace('.', lang === 'de' ? ',' : '.') : '');
    setError(null);
  }, [open, initialCat, budgets, lang]);
  const existing = budgets.find((b) => b.category === category);
  const submit = () => {
    const v = parseAmount(limit);
    if (v === null) return setError(t('f.err.amount'));
    setBudget({ category, limit: v });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('f.newBudget')} footer={<>
      {existing && <Button variant="ghost" icon="Trash2" aria-label={t('common.delete')} onClick={() => { removeBudget(category); onClose(); }} />}
      <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button><Button className="flex-1" onClick={submit}>{t('common.save')}</Button></>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div>
          <span className="label">{t('f.category')}</span>
          <div className="flex flex-wrap gap-2">{EXPENSE_CATEGORIES.map((c) => <Chip key={c} selected={category === c} onClick={() => { setCategory(c); const b = budgets.find((x) => x.category === c); setLimit(b ? String(b.limit / 100) : ''); }}>{cat(c)}</Chip>)}</div>
        </div>
        <Field label={`${t('f.limit')} (${base})`} error={error}>
          <Input inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={formatMoney(30000, base, lang)} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

export function GoalSheet({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: SavingsGoal | null }) {
  const { t } = useT();
  const save = useVybe((s) => s.saveGoal);
  const del = useVybe((s) => s.deleteGoal);
  const base = useVybe((s) => s.settings.baseCurrency);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<{ name?: string; target?: string }>({});
  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? ''); setTarget(goal ? String(goal.target / 100) : ''); setDeadline(goal?.deadline ?? ''); setErrors({});
  }, [open, goal]);
  const submit = () => {
    const n = name.trim();
    const v = parseAmount(target);
    const e: typeof errors = {};
    if (n.length < 2 || n.length > 40) e.name = t('f.err.name');
    if (v === null) e.target = t('f.err.amount');
    setErrors(e);
    if (e.name || e.target) return;
    save({ id: goal?.id ?? uid('s'), name: n, target: v!, saved: goal?.saved ?? 0, currency: goal?.currency ?? base, deadline: deadline || undefined, createdAt: goal?.createdAt ?? new Date().toISOString() });
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={goal ? goal.name : t('f.newGoal')} footer={<>
      {goal && <Button variant="ghost" icon="Trash2" aria-label={t('common.delete')} onClick={() => { del(goal.id); onClose(); }} />}
      <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button><Button className="flex-1" onClick={submit}>{t('common.save')}</Button></>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label={t('f.goalName')} error={errors.name}><Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={`${t('f.goalTarget')} (${goal?.currency ?? base})`} error={errors.target}><Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        <Field label={`${t('f.deadline')} (${t('common.optional')})`}><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

export function ContributeSheet({ goal, onClose }: { goal: SavingsGoal | null; onClose: () => void }) {
  const { t } = useT();
  const contribute = useVybe((s) => s.contribute);
  const toast = useVybe((s) => s.toast);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setAmount(''); setError(null); }, [goal]);
  const run = (sign: 1 | -1) => {
    const v = parseAmount(amount);
    if (v === null || !goal) return setError(t('f.err.amount'));
    contribute(goal.id, sign * Math.min(v, sign < 0 ? goal.saved : v));
    toast(t('set.saved'));
    onClose();
  };
  return (
    <Sheet open={!!goal} onClose={onClose} title={goal ? t('f.contributeTitle', { name: goal.name }) : ''} footer={<>
      <Button variant="secondary" className="flex-1" onClick={() => run(-1)} icon="Minus">{t('f.withdraw')}</Button>
      <Button className="flex-1" onClick={() => run(1)} icon="Plus">{t('f.deposit')}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); run(1); }}>
        <Field label={`${t('f.amount')} (${goal?.currency ?? ''})`} error={error}>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="font-display text-2xl" />
        </Field>
      </form>
    </Sheet>
  );
}
