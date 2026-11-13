import { useEffect, useState } from 'react';
import type { Attribute, Difficulty, Mission } from '@/domain/types';
import { ATTRIBUTES, DIFFICULTIES } from '@/domain/types';
import { MISSION_XP } from '@/domain/progression';
import { Sheet } from '@/components/ui/Sheet';
import { Button, Chip, Field, Input, Segmented } from '@/components/ui/primitives';
import { ATTR_ICON, Icon } from '@/components/ui/Icon';
import { useT } from '@/lib/i18n';
import { useVybe } from '@/store/useVybe';
import { uid } from '@/lib/id';
import { todayKey } from '@/lib/date';

export function MissionEditor({ open, onClose, mission }: { open: boolean; onClose: () => void; mission?: Mission | null }) {
  const { t, attr, diff } = useT();
  const save = useVybe((s) => s.saveMission);
  const del = useVybe((s) => s.deleteMission);
  const toast = useVybe((s) => s.toast);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [attribute, setAttribute] = useState<Attribute>('discipline');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [recurrence, setRecurrence] = useState<'once' | 'daily'>('once');
  const [target, setTarget] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(mission?.title ?? '');
    setNote(mission?.note ?? '');
    setAttribute(mission?.attribute ?? 'discipline');
    setDifficulty(mission?.difficulty ?? 'normal');
    setRecurrence(mission?.recurrence ?? 'once');
    setTarget(mission?.target ?? 1);
    setError(null);
    setConfirmDel(false);
  }, [open, mission]);

  const submit = () => {
    const tt = title.trim();
    if (tt.length < 2 || tt.length > 80) return setError(t('m.err.title'));
    const base: Mission = mission ?? { id: uid('m'), progress: {}, completed: {}, createdAt: new Date().toISOString(), source: 'user', title: '', attribute, difficulty, recurrence, target: 1 };
    save({
      ...base,
      title: tt,
      note: note.trim() || undefined,
      attribute,
      difficulty,
      recurrence,
      target: Math.max(1, Math.min(20, target)),
      date: recurrence === 'once' ? base.date ?? todayKey() : undefined,
    });
    toast(t('m.saved'));
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={mission ? t('m.edit') : t('m.new')}
      footer={
        <>
          {mission && (
            confirmDel ? (
              <Button variant="danger" onClick={() => { del(mission.id); toast(t('m.deleted')); onClose(); }}>{t('common.confirm')}</Button>
            ) : (
              <Button variant="ghost" icon="Trash2" aria-label={t('common.delete')} onClick={() => setConfirmDel(true)} />
            )
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className="flex-1" onClick={submit}>{t('common.save')}</Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {confirmDel && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{t('common.areYouSure')} {t('m.deleteHint')}</p>}
        <Field label={t('m.name')} error={error}>
          <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder={t('m.placeholder')} aria-invalid={!!error} />
        </Field>
        <Field label={`${t('m.note')} (${t('common.optional')})`}>
          <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div>
          <span className="label">{t('m.attribute')}</span>
          <div className="flex flex-wrap gap-2">
            {ATTRIBUTES.map((a) => <Chip key={a} icon={ATTR_ICON[a]} selected={attribute === a} onClick={() => setAttribute(a)}>{attr(a)}</Chip>)}
          </div>
        </div>
        <div>
          <span className="label">{t('m.difficulty')}</span>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip key={d} selected={difficulty === d} onClick={() => setDifficulty(d)}>
                {diff(d)} <span className="text-xs text-accent num">+{MISSION_XP[d]}</span>
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="label">{t('m.recurrence')}</span>
            <Segmented label="recurrence" value={recurrence} onChange={setRecurrence} options={[{ value: 'once', label: t('m.once') }, { value: 'daily', label: t('m.daily') }]} />
          </div>
          <Field label={t('m.target')} hint={t('m.targetHint')}>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="icon" icon="Minus" aria-label="-1" onClick={() => setTarget(Math.max(1, target - 1))} />
              <span className="w-8 text-center font-display text-lg font-semibold num">{target}</span>
              <Button type="button" variant="secondary" size="icon" icon="Plus" aria-label="+1" onClick={() => setTarget(Math.min(20, target + 1))} />
            </div>
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-accent/10 p-4">
          <span className="flex items-center gap-2 text-sm text-muted"><Icon name="Zap" size={16} className="text-accent" />{t('m.reward')}</span>
          <span className="font-display text-lg font-bold text-gradient num">+{MISSION_XP[difficulty]} XP · {attr(attribute)}</span>
        </div>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
