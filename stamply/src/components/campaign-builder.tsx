"use client";

import { Bell, Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useState } from "react";
import { saveCampaignAction } from "@/app/actions/business";
import type { Campaign } from "@/db/schema";
import { cn } from "@/lib/utils";
import { ActionForm, Field, SubmitButton } from "./forms";
import { Badge, buttonClass, Input, Notice, Select, Textarea } from "./ui";

type Seg = { id: string; label: string; description: string; reachable: number };
type Ent = { recurring: boolean; basic: boolean; advanced: boolean };

const TRIGGERS = [
  { id: "one_stamp_left", label: "Nur noch 1 Stempel", desc: "Wenn jemandem genau ein Stempel bis zur Belohnung fehlt – einmal pro Karte.", tier: "basic", title: "Fast geschafft! 🎉", body: "Nur noch ein Besuch bis zu deiner kostenlosen Belohnung." },
  { id: "reward_available", label: "Belohnung wartet", desc: "3 Tage nach Freischaltung, falls noch nicht eingelöst – einmal pro Belohnung.", tier: "basic", title: "Deine Belohnung wartet 🎁", body: "Du hast dir etwas verdient! Löse deine Belohnung beim nächsten Besuch ein." },
  { id: "new_program", label: "Neues Treueprogramm", desc: "Wenn du ein neues Programm aktivierst – einmal pro Programm.", tier: "basic", title: "Es gibt etwas Neues! ✨", body: "Bei deinem Lieblingsgeschäft gibt es ein neues Treueprogramm." },
  { id: "inactive_days", label: "Rückgewinnung", desc: "X Tage nach dem letzten Besuch – einmal pro Pause.", tier: "advanced", title: "Schon länger nicht gesehen! 👋", body: "Komm wieder vorbei und sammle deinen nächsten Stempel." },
  { id: "birthday", label: "Geburtstag", desc: "Am Geburtstag – nur Kund:innen, die dem ausdrücklich zugestimmt haben.", tier: "advanced", title: "Alles Gute zum Geburtstag! 🎂", body: "Wir haben eine kleine Überraschung für dich – komm vorbei!" },
] as const;

const STEPS = ["Art", "Zielgruppe", "Nachricht", "Zeitplan", "Vorschau"];
const local = (d: Date | null | undefined) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function CampaignBuilder({
  segments,
  programs,
  ent,
  businessName,
  slug,
  initial,
  initialSegment,
}: {
  segments: Seg[];
  programs: { id: string; name: string }[];
  ent: Ent;
  businessName: string;
  slug: string;
  initial?: Campaign;
  initialSegment?: string;
}) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<string>(initial?.type ?? "manual");
  const [trigger, setTrigger] = useState<string>(initial?.trigger ?? "one_stamp_left");
  const [segment, setSegment] = useState<string>(initial?.audience.segment ?? initialSegment ?? "all_consented");
  const [title, setTitle] = useState(initial?.title ?? "Wir vermissen dich! ☕");
  const [body, setBody] = useState(initial?.body ?? "Dein nächster Kaffee wartet schon auf dich. Komm diese Woche vorbei und sammle deinen nächsten Stempel!");
  const [sendMode, setSendMode] = useState<"now" | "later">(initial?.scheduledAt && initial.scheduledAt > new Date() ? "later" : "now");
  const [when, setWhen] = useState(local(initial?.scheduledAt));
  const [interval, setInterval] = useState<string>(initial?.intervalDays ? ([7, 14, 30].includes(initial.intervalDays) ? String(initial.intervalDays) : "custom") : "14");

  const seg = segments.find((s) => s.id === segment);
  const trig = TRIGGERS.find((t) => t.id === trigger)!;
  const locked = (tier: string) => (tier === "advanced" ? !ent.advanced : !ent.basic);

  return (
    <ActionForm action={saveCampaignAction} hideSubmit>
      {initial && <input type="hidden" name="campaignId" value={initial.id} />}
      {initial?.imagePath && <input type="hidden" name="existingImage" value={initial.imagePath} />}

      {/* Stepper */}
      <ol className="flex gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button type="button" onClick={() => setStep(i)} className={cn("w-full rounded-2xl px-3 py-2.5 text-left text-sm transition", i === step ? "bg-brand text-brand-fg" : i < step ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted")}>
              <span className="block text-[11px] font-semibold opacity-80">Schritt {i + 1}</span>
              <span className="font-semibold">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-h-80 space-y-4">
          {/* Step 1: type */}
          <section hidden={step !== 0} className="space-y-3">
            <input type="hidden" name="type" value={type} />
            <Field label="Name der Kampagne (intern)" name="name"><Input id="name" name="name" defaultValue={initial?.name ?? ""} placeholder="z. B. Herbst-Erinnerung" /></Field>
            {[
              { id: "manual", label: "Einmalige Nachricht", desc: "Sofort oder zu einem festen Zeitpunkt.", ok: true },
              { id: "recurring", label: "Wiederkehrende Nachricht", desc: "Alle 7, 14 oder 30 Tage – nur an Abonnent:innen.", ok: ent.recurring },
              { id: "trigger", label: "Automatisch bei Ereignis (empfohlen)", desc: "Nachricht passend zum Verhalten – kein Dauerfeuer, jede Person nur einmal pro Anlass.", ok: ent.basic },
            ].map((o) => (
              <button type="button" key={o.id} disabled={!o.ok} onClick={() => setType(o.id)} className={cn("flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition", type === o.id ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-2", !o.ok && "opacity-50")}>
                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", type === o.id ? "border-brand bg-brand text-white" : "border-surface-3")}>{type === o.id && <Check size={12} />}</span>
                <span><span className="block font-semibold">{o.label} {!o.ok && <Lock size={13} className="inline" />}</span><span className="text-sm text-muted">{o.desc}</span></span>
              </button>
            ))}
          </section>

          {/* Step 2: audience */}
          <section hidden={step !== 1} className="space-y-3">
            {type === "trigger" ? (
              <>
                <input type="hidden" name="trigger" value={trigger} />
                <p className="text-sm text-muted">Automationen gehen immer nur an Abonnent:innen, die das Ereignis gerade erleben.</p>
                {TRIGGERS.map((t) => (
                  <button type="button" key={t.id} disabled={locked(t.tier)} onClick={() => { setTrigger(t.id); if (!initial) { setTitle(t.title); setBody(t.body); } }} className={cn("flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition", trigger === t.id ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-2", locked(t.tier) && "opacity-50")}>
                    <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", trigger === t.id ? "border-brand bg-brand text-white" : "border-surface-3")}>{trigger === t.id && <Check size={12} />}</span>
                    <span className="flex-1"><span className="block font-semibold">{t.label} {locked(t.tier) && <Badge tone="brand">Premium</Badge>}</span><span className="text-sm text-muted">{t.desc}</span></span>
                  </button>
                ))}
                {trigger === "inactive_days" && (
                  <Field label="Tage ohne Besuch" name="triggerParam"><Input id="triggerParam" name="triggerParam" type="number" min={7} max={180} defaultValue={initial?.triggerParam ?? 14} /></Field>
                )}
              </>
            ) : (
              <>
                <input type="hidden" name="segment" value={segment} />
                {segments.map((s) => (
                  <button type="button" key={s.id} onClick={() => setSegment(s.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition", segment === s.id ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-2")}>
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", segment === s.id ? "border-brand bg-brand text-white" : "border-surface-3")}>{segment === s.id && <Check size={12} />}</span>
                    <span className="flex-1"><span className="block font-semibold">{s.label}</span><span className="text-sm text-muted">{s.description}</span></span>
                    <Badge tone={s.reachable ? "brand" : "neutral"}>{s.reachable} erreichbar</Badge>
                  </button>
                ))}
                {(segment === "almost_complete" || segment === "reward_available") && programs.length > 1 && (
                  <Field label="Nur für Programm (optional)" name="programId">
                    <Select id="programId" name="programId" defaultValue={initial?.audience.programId ?? ""}><option value="">Alle Programme</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                  </Field>
                )}
              </>
            )}
          </section>

          {/* Step 3: message */}
          <section hidden={step !== 2} className="space-y-4">
            <Field label={`Titel (${title.length}/60)`} name="title"><Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} /></Field>
            <Field label={`Nachricht (${body.length}/240)`} name="body" hint="Tipp: {vorname} wird durch den Vornamen ersetzt."><Textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={240} rows={4} /></Field>
            <Field label="Bild (optional)" name="image"><Input type="file" name="image" accept="image/*" className="h-auto py-2.5" /></Field>
            <Field label="Ziel beim Antippen" name="link" hint="Nur Seiten innerhalb von STAMPLY.">
              <Select id="link" name="link" defaultValue={initial?.link ?? `/b/${slug}`}>
                <option value={`/b/${slug}`}>Mein Unternehmensprofil</option>
                <option value="/rewards">Belohnungen der Kundin/des Kunden</option>
                <option value="/cards">Stempelkarten der Kundin/des Kunden</option>
              </Select>
            </Field>
          </section>

          {/* Step 4: schedule */}
          <section hidden={step !== 3} className="space-y-4">
            {type === "trigger" ? (
              <Notice tone="neutral">Automationen prüfen alle 15 Minuten, wer das Ereignis neu erlebt hat. Jede Person erhält die Nachricht höchstens einmal pro Anlass.</Notice>
            ) : (
              <>
                {type === "recurring" && (
                  <Field label="Intervall" name="intervalDays">
                    <Select id="intervalDays" name="intervalDays" value={interval} onChange={(e) => setInterval(e.target.value)}>
                      <option value="7">Alle 7 Tage</option>
                      <option value="14">Alle 14 Tage</option>
                      <option value="30">Alle 30 Tage</option>
                      <option value="custom" disabled={!ent.advanced}>Benutzerdefiniert {ent.advanced ? "" : "(Premium)"}</option>
                    </Select>
                  </Field>
                )}
                {type === "recurring" && interval === "custom" && (
                  <Field label="Alle X Tage" name="customInterval"><Input id="customInterval" name="customInterval" type="number" min={7} max={365} defaultValue={initial?.intervalDays ?? 21} /></Field>
                )}
                <input type="hidden" name="sendMode" value={sendMode} />
                <div className="grid grid-cols-2 gap-2">
                  {(["now", "later"] as const).map((m) => (
                    <button type="button" key={m} onClick={() => setSendMode(m)} className={cn("rounded-2xl border p-4 text-left text-sm font-semibold", sendMode === m ? "border-brand bg-brand-soft" : "border-line bg-surface")}>
                      {m === "now" ? (type === "recurring" ? "Ab sofort" : "Sofort senden") : "Später"}
                    </button>
                  ))}
                </div>
                {sendMode === "later" && (
                  <Field label="Versandzeitpunkt" name="scheduledAt">
                    <Input id="scheduledAt" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                    <input type="hidden" name="scheduledAt" value={when ? new Date(when).toISOString() : ""} />
                  </Field>
                )}
              </>
            )}
            <Notice tone="brand" title="Spam-Schutz ist immer aktiv">
              Keine Nachrichten zwischen 21 und 9 Uhr · max. 1 Nachricht pro 48 h und 3 pro Woche von dir je Person · keine identischen Nachrichten innerhalb von 14 Tagen · nur mit Einwilligung.
            </Notice>
          </section>

          {/* Step 5: review */}
          <section hidden={step !== 4} className="space-y-3 text-sm">
            <Summary label="Art" value={type === "manual" ? "Einmalig" : type === "recurring" ? "Wiederkehrend" : `Automatisch: ${trig.label}`} />
            {type !== "trigger" && <Summary label="Zielgruppe" value={`${seg?.label} · aktuell ${seg?.reachable ?? 0} erreichbar`} />}
            <Summary label="Versand" value={type === "trigger" ? "Laufend bei Ereignis" : sendMode === "now" ? "Sofort (außerhalb der Ruhezeiten)" : "Geplant"} />
            {type !== "trigger" && seg?.reachable === 0 && <Notice tone="warning">Aktuell ist niemand in dieser Zielgruppe erreichbar. Die Kampagne kann trotzdem gespeichert werden.</Notice>}
            <div className="flex flex-wrap gap-3 pt-3">
              <SubmitButton name="intent" value="activate">{initial ? "Speichern & aktivieren" : "Kampagne aktivieren"}</SubmitButton>
              <SubmitButton name="intent" value="draft" variant="outline">Als Entwurf speichern</SubmitButton>
            </div>
          </section>

          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep(Math.max(0, step - 1))} className={buttonClass("ghost", "sm")} disabled={step === 0}><ChevronLeft size={16} /> Zurück</button>
            {step < STEPS.length - 1 && <button type="button" onClick={() => setStep(step + 1)} className={buttonClass("secondary", "sm")}>Weiter <ChevronRight size={16} /></button>}
          </div>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <p className="mb-2 text-sm font-semibold text-muted">Vorschau auf dem Sperrbildschirm</p>
          <div className="rounded-[2.5rem] bg-[linear-gradient(160deg,#2a1d6b,#6c47ff_60%,#b79cff)] p-4 pb-16 pt-10 shadow-pop">
            <p className="text-center text-5xl font-semibold text-white/90">9:41</p>
            <div className="mt-8 rounded-3xl bg-white/80 p-3.5 text-[#0b0b10] backdrop-blur-xl">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-black/50">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#6c47ff] text-white"><Bell size={11} /></span> STAMPLY · {businessName}<span className="ml-auto normal-case">jetzt</span>
              </div>
              <p className="mt-1.5 text-[15px] font-semibold leading-snug">{title.replace(/\{vorname\}/gi, "Anna") || "Titel"}</p>
              <p className="text-[14px] leading-snug text-black/75">{body.replace(/\{vorname\}/gi, "Anna") || "Nachricht"}</p>
            </div>
          </div>
        </aside>
      </div>
    </ActionForm>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-surface-2 px-4 py-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
