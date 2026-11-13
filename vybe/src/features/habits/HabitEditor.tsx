import { useEffect, useState } from 'react';
import type { Attribute, Habit } from '@/domain/types';
import { ATTRIBUTES } from '@/domain/types';
import { Sheet } from '@/components/ui/Sheet';
import { Button, Chip, Field, Input } from '@/components/ui/primitives';
import { ATTR_ICON, HABIT_ICONS, Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/i18n';
import { useVybe } from '@/store/useVybe';
import { uid } from '@/lib/id';
import { HABIT_COLORS } from './HabitPill';
import { cn } from '@/lib/cn';

export function HabitEditor({ open, onClose, habit }: { open: boolean; onClose: () => void; habit?: Habit | null }) {
  const { t, attr } = useT();
  const save = useVybe((s) => s.saveHabit);
  const del = useVybe((s) => s.deleteHabit);
  const toast = useVybe((s) => s.toast);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('BookOpen');
  const [attribute, setAttribute] = useState<Attribute>('discipline');
  const [weeklyTarget, setWeekly] = useState(7);
  const [color, setColor] = useState<Habit['color']>('violet');
  const [reminder, setReminder] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? '');
    setIcon(habit?.icon ?? 'BookOpen');
    setAttribute(habit?.attribute ?? 'discipline');
    setWeekly(habit?.weeklyTarget ?? 7);
    setColor(habit?.color ?? 'violet');
    setReminder(habit?.reminder ?? '');
    setError(null);
    setConfirmDel(false);
  }, [open, habit]);

  const submit = () => {
    const n = name.trim();
    if (n.length < 2 || n.length > 40) return setError(t('h.err.name'));
    const base: Habit = habit ?? { id: uid('h'), log: {}, createdAt: new Date().toISOString(), name: n, icon, attribute, weeklyTarget, color };
    save({ ...base, name: n, icon, attribute, weeklyTarget, color, reminder: /^\d{2}:\d{2}$/.test(reminder) ? reminder : undefined });
    toast(t('h.saved'));
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={habit ? t('h.edit') : t('h.new')}
      footer={
        <>
          {habit && (confirmDel
            ? <Button variant="danger" onClick={() => { del(habit.id); toast(t('h.deleted')); onClose(); }}>{t('common.confirm')}</Button>
            : <Button variant="ghost" icon="Trash2" aria-label={t('common.delete')} onClick={() => setConfirmDel(true)} />)}
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="flex-1" onClick={submit}>{t('common.save')}</Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {confirmDel && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{t('common.areYouSure')} {t('m.deleteHint')}</p>}
        <Field label={t('h.name')} error={error}>
          <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-invalid={!!error} />
        </Field>
        <div>
          <span className="label">{t('h.icon')}</span>
          <div className="grid grid-cols-8 gap-2">
            {HABIT_ICONS.map((i) => (
              <button key={i} type="button" aria-label={i} aria-pressed={icon === i} onClick={() => setIcon(i)}
                className={cn('grid aspect-square place-items-center rounded-xl border transition', icon === i ? 'border-accent/60 bg-accent/15 text-accent' : 'hairline text-muted hover:text-fg')}>
                <Icon name={i} size={18} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">{t('h.color')}</span>
          <div className="flex gap-3">
            {(Object.keys(HABIT_COLORS) as Habit['color'][]).map((c) => (
              <button key={c} type="button" aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)}
                className={cn('h-9 w-9 rounded-full transition', color === c && 'ring-2 ring-offset-2 ring-offset-surface')}
                style={{ background: `rgb(${HABIT_COLORS[c]})`, ['--tw-ring-color' as string]: `rgb(${HABIT_COLORS[c]})` }} />
            ))}
          </div>
        </div>
        <div>
          <span className="label">{t('m.attribute')}</span>
          <div className="flex flex-wrap gap-2">
            {ATTRIBUTES.map((a) => <Chip key={a} icon={ATTR_ICON[a]} selected={attribute === a} onClick={() => setAttribute(a)}>{attr(a)}</Chip>)}
          </div>
        </div>
        <div>
          <span className="label">{t('h.weekly')}</span>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <Chip key={n} selected={weeklyTarget === n} onClick={() => setWeekly(n)}>{n === 7 ? t('h.everyDay') : `${n}${t('h.perWeek')}`}</Chip>
            ))}
          </div>
        </div>
        <Field label={`${t('h.reminder')} (${t('common.optional')})`} hint={t('h.reminderHint')}>
          <Input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
