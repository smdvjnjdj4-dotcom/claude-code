"use client";

import { useState } from "react";
import { saveProgramAction } from "@/app/actions/business";
import type { LoyaltyProgram } from "@/db/schema";
import { ActionForm, Field, SubmitButton } from "./forms";
import { Input, Select, StampDots, Textarea } from "./ui";

const REWARD_TYPES = [
  ["free_product", "Kostenloses Produkt", "z. B. 1 Kaffee gratis"],
  ["percent_discount", "Prozentrabatt", "z. B. 20 % auf den nächsten Termin"],
  ["fixed_discount", "Fester Rabatt", "z. B. 10 € Rabatt"],
  ["free_service", "Kostenlose Dienstleistung", "z. B. Augenbrauen zupfen gratis"],
  ["free_upgrade", "Kostenloses Upgrade", "z. B. großer statt kleiner Becher"],
  ["custom", "Individuelle Belohnung", "Frei beschreiben"],
] as const;

const COLORS = ["#6C47FF", "#0A84FF", "#12A150", "#FF6B35", "#E5484D", "#D6409F", "#111117", "#B08D57"];

const TEMPLATES = [
  { label: "☕ 10 Kaffees → 1 gratis", v: { name: "Kaffeekarte", stamps: 10, type: "free_product", title: "1 Kaffee nach Wahl gratis" } },
  { label: "💈 5 Haarschnitte → 10 €", v: { name: "Haarschnitt-Treue", stamps: 5, type: "fixed_discount", title: "auf deinen nächsten Haarschnitt", value: "10" } },
  { label: "🍝 8 Besuche → Dessert", v: { name: "Stammgast-Karte", stamps: 8, type: "free_product", title: "1 Dessert gratis" } },
  { label: "💅 6 Termine → 20 %", v: { name: "Nagel-Treue", stamps: 6, type: "percent_discount", title: "auf deinen nächsten Termin", value: "20" } },
] as const;

const d = (x: Date | null | undefined) => (x ? new Date(x).toISOString().slice(0, 10) : "");

export function ProgramEditor({ program, locations }: { program?: LoyaltyProgram; locations: { id: string; name: string }[] }) {
  const [name, setName] = useState(program?.name ?? "");
  const [stamps, setStamps] = useState(program?.stampsRequired ?? 10);
  const [type, setType] = useState<string>(program?.rewardType ?? "free_product");
  const [title, setTitle] = useState(program?.rewardTitle ?? "");
  const [value, setValue] = useState(
    program?.rewardValue == null ? "" : program.rewardType === "fixed_discount" ? String(program.rewardValue / 100) : String(program.rewardValue),
  );
  const [color, setColor] = useState(program?.color ?? COLORS[0]);
  const [key, setKey] = useState(0);

  const preview =
    type === "percent_discount" && value ? `${value} % Rabatt ${title}` : type === "fixed_discount" && value ? `${value} € Rabatt ${title}` : title || "Deine Belohnung";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ActionForm action={saveProgramAction} hideSubmit key={key}>
        {program && <input type="hidden" name="programId" value={program.id} />}
        {!program && (
          <div>
            <p className="mb-2 text-sm font-semibold">Schnellstart-Vorlagen</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    setName(t.v.name);
                    setStamps(t.v.stamps);
                    setType(t.v.type);
                    setTitle(t.v.title);
                    setValue("value" in t.v ? t.v.value : "");
                    setKey((k) => k + 1);
                  }}
                  className="rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-2"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Field label="Name des Programms" name="name"><Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Beschreibung (optional)" name="description"><Textarea id="description" name="description" defaultValue={program?.description} rows={2} /></Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Benötigte Stempel" name="stampsRequired">
            <Input id="stampsRequired" name="stampsRequired" type="number" min={2} max={30} value={stamps} onChange={(e) => setStamps(Number(e.target.value))} required />
          </Field>
          <Field label="Belohnungstyp" name="rewardType">
            <Select id="rewardType" name="rewardType" value={type} onChange={(e) => setType(e.target.value)}>
              {REWARD_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Belohnung" name="rewardTitle" hint={REWARD_TYPES.find((r) => r[0] === type)?.[2]}>
            <Input id="rewardTitle" name="rewardTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          {(type === "percent_discount" || type === "fixed_discount") && (
            <Field label={type === "percent_discount" ? "Rabatt in %" : "Rabatt in €"} name="rewardValue">
              <Input id="rewardValue" name="rewardValue" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required />
            </Field>
          )}
        </div>

        <details className="rounded-2xl border border-line p-4" open={!!program}>
          <summary className="cursor-pointer font-semibold">Regeln & Bedingungen</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Mindestumsatz (€)" name="minPurchaseCents" hint="Wird bei der Bonprüfung kontrolliert.">
              <Input id="minPurchase" name="minPurchase" inputMode="decimal" defaultValue={program?.minPurchaseCents ? String(program.minPurchaseCents / 100) : ""} placeholder="0" />
            </Field>
            <Field label="Max. Stempel pro Tag" name="maxStampsPerDay"><Input id="maxStampsPerDay" name="maxStampsPerDay" type="number" min={1} max={10} defaultValue={program?.maxStampsPerDay ?? 1} /></Field>
            <Field label="Stempel gültig (Tage)" name="stampValidityDays" hint="Leer = unbegrenzt"><Input id="stampValidityDays" name="stampValidityDays" type="number" min={7} defaultValue={program?.stampValidityDays ?? ""} /></Field>
            <Field label="Belohnung einlösbar (Tage)" name="rewardValidityDays" hint="Leer = unbegrenzt"><Input id="rewardValidityDays" name="rewardValidityDays" type="number" min={7} defaultValue={program?.rewardValidityDays ?? ""} /></Field>
            <Field label="Startdatum" name="startsAt"><Input id="startsAt" name="startsAt" type="date" defaultValue={d(program?.startsAt)} /></Field>
            <Field label="Enddatum" name="endsAt"><Input id="endsAt" name="endsAt" type="date" defaultValue={d(program?.endsAt)} /></Field>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Erlaubte Produkte/Dienstleistungen" name="eligibleItems" hint="z. B. „Alle Heißgetränke“ – wird Kund:innen angezeigt."><Input id="eligibleItems" name="eligibleItems" defaultValue={program?.eligibleItems} /></Field>
            <Field label="Einlösebedingungen" name="redemptionTerms"><Textarea id="redemptionTerms" name="redemptionTerms" rows={2} defaultValue={program?.redemptionTerms} placeholder="z. B. Nicht mit anderen Aktionen kombinierbar." /></Field>
            {locations.length > 1 && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Teilnehmende Filialen <span className="font-normal text-muted">(keine Auswahl = alle)</span></legend>
                <div className="flex flex-wrap gap-3">
                  {locations.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="locationIds" value={l.id} defaultChecked={program?.locationIds?.includes(l.id)} className="accent-[var(--brand)]" /> {l.name}</label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </details>

        <div>
          <p className="mb-2 text-sm font-semibold">Farbe & Bild</p>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Farbe ${c}`} className="h-9 w-9 rounded-full ring-offset-2 ring-offset-bg transition" style={{ background: c, boxShadow: color === c ? `0 0 0 3px var(--bg), 0 0 0 5px ${c}` : undefined }} />
            ))}
            <input type="hidden" name="color" value={color} />
          </div>
          <Input type="file" name="image" accept="image/*" className="mt-3 h-auto py-2.5" aria-label="Programmbild" />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {program ? (
            <SubmitButton>Änderungen speichern</SubmitButton>
          ) : (
            <>
              <SubmitButton name="intent" value="activate">Speichern & aktivieren</SubmitButton>
              <SubmitButton name="intent" value="draft" variant="outline">Als Entwurf speichern</SubmitButton>
            </>
          )}
        </div>
      </ActionForm>

      <aside className="lg:sticky lg:top-10 lg:self-start">
        <p className="mb-2 text-sm font-semibold text-muted">Vorschau</p>
        <div className="overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-pop">
          <div className="h-2" style={{ background: color }} />
          <div className="p-5">
            <p className="text-sm font-semibold text-muted">{name || "Programmname"}</p>
            <p className="mt-1 text-lg font-bold">{preview}</p>
            <p className="text-sm text-muted">nach {stamps || "?"} Stempeln</p>
            <div className="mt-4"><StampDots progress={Math.min(3, Math.max(0, stamps - 1))} required={Math.min(30, Math.max(2, stamps || 2))} color={color} /></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
