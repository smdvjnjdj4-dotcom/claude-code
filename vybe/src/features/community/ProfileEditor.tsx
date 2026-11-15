import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button, Chip, Field, Input, Toggle } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useCT, type CKey } from '@/community/i18n';
import { FREE_TEXT_KEYS, OPTIONS, interestLabel, normInterest } from '@/community/options';
import { INTEREST_KEYS, LIMITS, type CommunityProfile, type InterestKey, type MemberDoc } from '@/community/types';
import { emptyMemberDoc, emptyProfile } from '@/community/model';
import type { CommunityState } from '@/community/useCommunity';
import { useVybe } from '@/store/useVybe';
import { useProgress } from '@/store/selectors';
import { cn } from '@/lib/cn';

const SECTION_ICON: Record<InterestKey, string> = {
  musicGenres: 'Music', artists: 'Star', movieGenres: 'Camera', movies: 'Camera', series: 'Activity', hobbies: 'Palette', sports: 'Dumbbell',
  games: 'Gem', books: 'BookOpen', languages: 'Globe', personality: 'Heart', lookingFor: 'Users',
};
// Order: what you're looking for first (drives matching), then taste.
const ORDER: InterestKey[] = ['lookingFor', 'musicGenres', 'artists', 'movieGenres', 'movies', 'series', 'hobbies', 'sports', 'games', 'books', 'languages', 'personality'];

export function useStatsSnapshot(): CommunityProfile['stats'] {
  const { level, streak, attributes } = useProgress();
  const top = [...attributes].sort((a, b) => b.xp - a.xp)[0];
  return { level: level.level, streak, topAttribute: top.id };
}

export function ProfileEditor({ open, onClose, community }: { open: boolean; onClose: () => void; community: CommunityState }) {
  const { ct } = useCT();
  const toast = useVybe((s) => s.toast);
  const ownName = useVybe((s) => s.profile?.name ?? '');
  const stats = useStatsSnapshot();
  const existing = community.me;
  const [p, setP] = useState<CommunityProfile>(emptyProfile());
  const [ageText, setAgeText] = useState('');
  const [errors, setErrors] = useState<{ nick?: string; age?: string }>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = existing?.profile ?? emptyProfile(ownName.slice(0, LIMITS.nickname[1]));
    setP(base);
    setAgeText(base.age ? String(base.age) : '');
    setErrors({});
    setConfirmDel(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setI = (k: InterestKey, values: string[]) => setP((x) => ({ ...x, interests: { ...x.interests, [k]: values.slice(0, LIMITS.tagsPerKey) } }));

  const submit = async () => {
    const nick = p.nickname.trim();
    const age = ageText.trim() ? Number(ageText) : NaN;
    const e: typeof errors = {};
    if (nick.length < LIMITS.nickname[0] || nick.length > LIMITS.nickname[1]) e.nick = ct('edit.err.nick');
    if (!Number.isInteger(age) || age < LIMITS.minAge || age > LIMITS.maxAge) e.age = ct('edit.err.age');
    setErrors(e);
    if (e.nick || e.age) return;
    const profile: CommunityProfile = { ...p, nickname: nick, age, city: p.city.trim(), pronouns: p.pronouns.trim(), bio: p.bio.trim(), stats: p.shareStats ? stats : null, updatedAt: new Date().toISOString() };
    setBusy(true);
    const ok = existing ? await community.save((d: MemberDoc) => ({ ...d, profile })) : await community.create(emptyMemberDoc(profile));
    setBusy(false);
    if (ok) { toast(ct('edit.saved')); onClose(); }
  };

  const remove = async () => {
    await community.backend?.deleteMine();
    toast(ct('edit.deleted'));
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={ct('edit.title')} footer={<>
      {existing && (confirmDel
        ? <Button variant="danger" onClick={remove}>{ct('confirm')}</Button>
        : <Button variant="ghost" icon="Trash2" aria-label={ct('edit.delete')} onClick={() => setConfirmDel(true)} />)}
      <Button variant="secondary" className="flex-1" onClick={onClose}>{ct('cancel')}</Button>
      <Button className="flex-1" onClick={submit} disabled={busy}>{ct('save')}</Button>
    </>}>
      <form className="space-y-7" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {confirmDel && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{ct('edit.deleteText')}</p>}
        <section className="space-y-4">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted">{ct('edit.basics')}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Field label={ct('edit.nickname')} error={errors.nick}><Input id="cp-nick" value={p.nickname} maxLength={LIMITS.nickname[1]} onChange={(e) => setP({ ...p, nickname: e.target.value })} /></Field></div>
            <Field label={ct('edit.age')} error={errors.age}><Input id="cp-age" inputMode="numeric" value={ageText} maxLength={2} onChange={(e) => setAgeText(e.target.value.replace(/\D/g, ''))} /></Field>
          </div>
          <p className="-mt-2 text-xs text-faint">{ct('edit.ageHint')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={ct('edit.city')}><Input id="cp-city" value={p.city} maxLength={LIMITS.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field>
            <Field label={ct('edit.pronouns')}><Input id="cp-pron" value={p.pronouns} maxLength={LIMITS.pronouns} onChange={(e) => setP({ ...p, pronouns: e.target.value })} /></Field>
          </div>
          <Field label={ct('edit.bio')} hint={`${p.bio.length}/${LIMITS.bio}`}>
            <textarea id="cp-bio" className="input min-h-[88px] resize-y" maxLength={LIMITS.bio} placeholder={ct('edit.bioPh')} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} />
          </Field>
        </section>

        {ORDER.map((k) => (
          <TagPicker key={k} k={k} values={p.interests[k]} onChange={(v) => setI(k, v)} />
        ))}

        <section>
          <h3 className="mb-1 font-display text-sm font-semibold uppercase tracking-wider text-muted">{ct('edit.privacy')}</h3>
          <Toggle label={ct('edit.discoverable')} description={ct('edit.discoverableHint')} checked={p.discoverable} onChange={(v) => setP({ ...p, discoverable: v })} />
          <Toggle label={ct('edit.showAge')} checked={p.showAge} onChange={(v) => setP({ ...p, showAge: v })} />
          <Toggle label={ct('edit.shareStats')} checked={p.shareStats} onChange={(v) => setP({ ...p, shareStats: v })} />
        </section>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

function TagPicker({ k, values, onChange }: { k: InterestKey; values: string[]; onChange: (v: string[]) => void }) {
  const { ct, lang } = useCT();
  const [custom, setCustom] = useState('');
  const [expanded, setExpanded] = useState(false);
  const options = OPTIONS[k] ?? [];
  const optionIds = new Set(options.map((o) => o[0]));
  const customValues = values.filter((v) => !optionIds.has(v));
  const shown = expanded ? options : options.slice(0, 14);
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const addCustom = () => {
    const v = custom.trim().slice(0, LIMITS.tag);
    if (v.length >= 2 && !values.some((x) => normInterest(x) === normInterest(v))) onChange([...values, v]);
    setCustom('');
  };
  const free = FREE_TEXT_KEYS.includes(k);
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold"><Icon name={SECTION_ICON[k]} size={16} className="text-accent" />{ct(`cat.${k}` as CKey)}</h3>
        {values.length > 0 && <span className="text-xs text-muted num">{ct('edit.selected', { n: values.length })}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {shown.map(([id]) => <Chip key={id} selected={values.includes(id)} onClick={() => toggle(id)} className="py-1.5 text-[13px]">{interestLabel(id, lang)}</Chip>)}
        {customValues.map((v) => (
          <Chip key={v} selected onClick={() => toggle(v)} className="py-1.5 text-[13px]">{v}<Icon name="X" size={12} /></Chip>
        ))}
        {options.length > 14 && (
          <button type="button" onClick={() => setExpanded(!expanded)} className="rounded-full px-3 py-1.5 text-[13px] text-accent hover:underline">
            {expanded ? ct('edit.showLess') : `${ct('edit.showAll')} (${options.length})`}
          </button>
        )}
      </div>
      <div className={cn('flex gap-2', !!(options.length || customValues.length) && 'mt-2.5')}>
        <Input id={`cp-add-${k}`} value={custom} maxLength={LIMITS.tag} onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={free ? ct(`ph.${k}` as CKey) : ct('edit.addCustom')} className="py-2 text-sm" aria-label={`${ct(`cat.${k}` as CKey)}: ${ct('edit.addCustom')}`} />
        <Button type="button" size="icon" variant="secondary" icon="Plus" aria-label={ct('edit.addCustom')} onClick={addCustom} disabled={values.length >= LIMITS.tagsPerKey} />
      </div>
    </section>
  );
}

export const ALL_KEYS = INTEREST_KEYS;
