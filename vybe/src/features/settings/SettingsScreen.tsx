import { useRef, useState, type ReactNode } from 'react';
import { Page, PageHeader } from '@/components/layout/Page';
import { Badge, Button, Card, Field, Input, Segmented, Toggle } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useVybe, pickData } from '@/store/useVybe';
import { useT, type TKey } from '@/lib/i18n';
import { exportJson } from '@/store/importExport';
import { probe } from '@/ai/httpProvider';
import { AURAS } from '@/domain/progression';
import { useProgress } from '@/store/selectors';
import { CURRENCIES } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AccentTheme } from '@/domain/types';
import { navigate } from '@/lib/router';

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted"><Icon name={icon} size={14} />{title}</h2>
      <Card className="divide-y divide-line/5 py-2">{children}</Card>
    </section>
  );
}
function Row({ children }: { children: ReactNode }) {
  return <div className="py-3">{children}</div>;
}

export default function SettingsScreen() {
  const { t } = useT();
  const s = useVybe((st) => st.settings);
  const profile = useVybe((st) => st.profile);
  const update = useVybe((st) => st.updateSettings);
  const updateProfile = useVybe((st) => st.updateProfile);
  const importJson = useVybe((st) => st.importJson);
  const resetAll = useVybe((st) => st.resetAll);
  const startDemo = useVybe((st) => st.startDemo);
  const toast = useVybe((st) => st.toast);
  const { level } = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile?.name ?? '');
  const [endpoint, setEndpoint] = useState(s.ai.endpoint);
  const [aiStatus, setAiStatus] = useState<null | boolean>(null);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetWord, setResetWord] = useState('');

  const doExport = () => {
    const blob = new Blob([exportJson(pickData(useVybe.getState()))], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vybe-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const doImport = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast(t('set.importErr'), 'err');
    const res = importJson(await file.text());
    toast(res.ok ? t('set.imported') : t('set.importErr'), res.ok ? 'ok' : 'err');
  };
  const enableNotifications = async (on: boolean) => {
    setNotifMsg(null);
    if (!on) return update({ notifications: { ...s.notifications, enabled: false } });
    if (typeof Notification === 'undefined') return setNotifMsg(t('set.notifUnsupported'));
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm !== 'granted') return setNotifMsg(t('set.notifDenied'));
    update({ notifications: { ...s.notifications, enabled: true } });
  };
  const saveEndpoint = async () => {
    const v = endpoint.trim();
    // Only relative paths or https URLs — and never anything that looks like a key.
    if (!/^(\/[\w\-/.]*|https:\/\/[^\s?]+)$/.test(v)) { setAiStatus(false); return; }
    update({ ai: { endpoint: v } });
    setAiStatus(await probe(v));
  };

  return (
    <Page>
      <PageHeader title={t('set.title')} />
      <div className="mx-auto max-w-2xl space-y-6">
        <Section title={t('set.profile')} icon="User">
          <Row>
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (n.length >= 1 && n.length <= 30) { updateProfile({ name: n }); toast(t('set.saved')); } }}>
              <div className="flex-1"><Field label={t('set.name')}><Input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} /></Field></div>
              <Button type="submit" variant="secondary">{t('common.save')}</Button>
            </form>
          </Row>
          <Row>
            <span className="label">{t('set.dailyTime')}</span>
            <Segmented label="time" value={String(profile?.dailyMinutes ?? 30)} onChange={(v) => updateProfile({ dailyMinutes: Number(v) })} options={[15, 30, 60, 120].map((m) => ({ value: String(m), label: `${m} ${t('ob.min')}` }))} />
          </Row>
        </Section>

        <Section title={t('set.appearance')} icon="Palette">
          <Row>
            <span className="label">{t('set.theme')}</span>
            <Segmented label="theme" value={s.theme} onChange={(v) => update({ theme: v })} options={[{ value: 'dark', label: t('set.dark') }, { value: 'light', label: t('set.light') }, { value: 'system', label: t('set.system') }]} />
          </Row>
          <Row>
            <span className="label">{t('set.accent')}</span>
            <div className="flex flex-wrap gap-2">
              {AURAS.map((a) => {
                const locked = level.level < a.level;
                return (
                  <button key={a.id} disabled={locked} onClick={() => update({ accent: a.id as AccentTheme })} aria-pressed={s.accent === a.id}
                    className={cn('flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-40', s.accent === a.id ? 'border-accent/60 bg-accent/15' : 'hairline')}>
                    {locked && <Icon name="Lock" size={12} />}{t(`aura.${a.id}` as TKey)}
                  </button>
                );
              })}
            </div>
          </Row>
          <Row>
            <span className="label">{t('set.language')}</span>
            <Segmented label="lang" value={s.lang} onChange={(v) => update({ lang: v })} options={[{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }]} />
          </Row>
        </Section>

        <Section title={t('set.access')} icon="Heart">
          <Row>
            <span className="label">{t('set.motion')}</span>
            <Segmented label="motion" value={s.motion} onChange={(v) => update({ motion: v })} options={[{ value: 'system', label: t('set.system') }, { value: 'reduced', label: t('set.motionReduced') }, { value: 'full', label: t('set.motionFull') }]} />
          </Row>
          <Toggle label={t('set.largeText')} checked={s.largeText} onChange={(v) => update({ largeText: v })} />
          <Toggle label={t('set.contrast')} checked={s.highContrast} onChange={(v) => update({ highContrast: v })} />
        </Section>

        <Section title={t('set.notifications')} icon="Bell">
          <Toggle label={t('set.notifEnable')} description={notifMsg ?? t('set.notifNote')} checked={s.notifications.enabled} onChange={enableNotifications} />
          <Toggle label={t('set.notifHabits')} disabled={!s.notifications.enabled} checked={s.notifications.habitReminders} onChange={(v) => update({ notifications: { ...s.notifications, habitReminders: v } })} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1"><Toggle label={t('set.notifPlan')} disabled={!s.notifications.enabled} checked={s.notifications.dailyPlan} onChange={(v) => update({ notifications: { ...s.notifications, dailyPlan: v } })} /></div>
            <input type="time" aria-label={t('set.notifPlan')} className="input w-28 py-2" disabled={!s.notifications.enabled || !s.notifications.dailyPlan} value={s.notifications.dailyPlanTime} onChange={(e) => update({ notifications: { ...s.notifications, dailyPlanTime: e.target.value || '08:00' } })} />
          </div>
        </Section>

        <Section title={t('set.privacy')} icon="Shield">
          <Row><p className="flex items-start gap-2 text-sm text-muted"><Icon name="Lock" size={15} className="mt-0.5 shrink-0 text-success" />{t('set.localOnly')}</p></Row>
          <Toggle label={t('set.hideAmounts')} checked={s.hideAmounts} onChange={(v) => update({ hideAmounts: v })} />
          <Toggle label={t('set.shareActivity')} checked={s.privacy.shareActivityWithFriends} onChange={(v) => update({ privacy: { ...s.privacy, shareActivityWithFriends: v } })} />
          <Row>
            <Field label={t('set.currency')}>
              <select className="input" value={s.baseCurrency} onChange={(e) => update({ baseCurrency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
          </Row>
        </Section>

        <Section title={t('set.ai')} icon="Bot">
          <Row>
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); saveEndpoint(); }}>
              <div className="flex-1"><Field label={t('set.aiEndpoint')} hint={t('set.aiHint')}><Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} spellCheck={false} /></Field></div>
              <Button type="submit" variant="secondary" className="mb-6">{t('set.aiTest')}</Button>
            </form>
            {aiStatus !== null && <Badge tone={aiStatus ? 'success' : 'warn'}>{aiStatus ? t('set.aiOk') : t('set.aiFail')}</Badge>}
          </Row>
        </Section>

        <Section title={t('set.data')} icon="Download">
          <Row>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon="Download" onClick={doExport}>{t('set.export')}</Button>
              <Button variant="secondary" icon="Upload" onClick={() => fileRef.current?.click()}>{t('set.import')}</Button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ''; }} />
            </div>
          </Row>
          <Row>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" icon="Sparkles" onClick={() => { startDemo(); navigate('home'); }}>{t('set.restartDemo')}</Button>
              <Button variant="danger" icon="Trash2" onClick={() => { setResetWord(''); setResetOpen(true); }}>{t('set.reset')}</Button>
            </div>
          </Row>
        </Section>

        <p className="pb-4 text-center text-xs text-faint">VYBE · {t('app.tagline')} · {t('set.version')} {__APP_VERSION__}</p>
      </div>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title={t('set.reset')} footer={<>
        <Button variant="secondary" className="flex-1" onClick={() => setResetOpen(false)}>{t('common.cancel')}</Button>
        <Button variant="danger" className="flex-1" disabled={resetWord.trim().toUpperCase() !== t('set.resetWord')} onClick={() => { resetAll(); setResetOpen(false); toast(t('set.resetDone')); navigate('home'); }}>{t('common.delete')}</Button>
      </>}>
        <p className="mb-4 text-sm text-muted">{t('set.resetText')}</p>
        <Field label={t('set.resetConfirm')}><Input value={resetWord} onChange={(e) => setResetWord(e.target.value)} autoComplete="off" /></Field>
      </Sheet>
    </Page>
  );
}
