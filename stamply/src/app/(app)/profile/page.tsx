import { Download, LogOut } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/app/actions/customer";
import { PushToggle, ThemeToggle } from "@/components/client";
import { ActionForm, Field } from "@/components/forms";
import { ConsentRow } from "@/components/consent-row";
import { Avatar, Button, buttonClass, Card, CardBody, CardHeader, Input, PageHeader, Switch } from "@/components/ui";
import { getDb } from "@/db";
import { CATEGORIES } from "@/domain/businesses";
import { consentText } from "@/domain/consent";
import { myBusinessRelations } from "@/domain/customers";
import { requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { fileUrl } from "@/lib/storage";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser("customer");
  const relations = await myBusinessRelations(getDb(), user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profil" />
      <Card className="flex items-center gap-4 p-5">
        <Avatar name={user.name} src={fileUrl(user.avatarPath)} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <form action={logoutAction}><Button variant="outline" size="sm"><LogOut size={15} /> Abmelden</Button></form>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/activity" className={buttonClass("outline", "md")}>Aktivitäten</Link>
        <Link href="/notifications" className={buttonClass("outline", "md")}>Benachrichtigungen</Link>
      </div>

      <Card>
        <CardHeader title="Persönliche Angaben" description="Alle Angaben außer dem Namen sind freiwillig." />
        <CardBody>
          <ActionForm action={updateProfileAction} submitLabel="Speichern">
            <Field label="Name" name="name"><Input id="name" name="name" defaultValue={user.name} required /></Field>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Interessen <span className="font-normal text-muted">(für persönliche Empfehlungen)</span></legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <label key={c.id} className="cursor-pointer">
                    <input type="checkbox" name="interests" value={c.id} defaultChecked={user.interests.includes(c.id)} className="peer sr-only" />
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium transition peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">
                      {c.emoji} {c.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="rounded-2xl bg-surface-2 p-4">
              <Field label="Geburtstag (optional)" name="birthday" hint="Wird nur gespeichert, wenn du unten zustimmst. Ohne Zustimmung wird er gelöscht.">
                <Input id="birthday" name="birthday" type="date" defaultValue={user.birthday ?? ""} className="bg-surface" />
              </Field>
              <Switch name="birthdayConsent" defaultChecked={!!user.birthdayConsentAt} label="Geburtstagsüberraschungen erlauben" description="Ich willige ein, dass STAMPLY meinen Geburtstag speichert, damit Geschäfte, deren Updates ich abonniert habe, mir an meinem Geburtstag eine Nachricht senden können. Widerruf jederzeit." />
            </div>
            <div className="divide-y divide-line">
              <Switch name="transactionalPush" defaultChecked={user.transactionalPush} label="Stempel- & Belohnungsbestätigungen" description="Push-Nachricht, wenn du einen Stempel oder eine Belohnung erhältst." />
              <Switch name="marketingPaused" defaultChecked={user.marketingPaused} label="Alle Werbenachrichten pausieren" description="Pausiert Angebote aller Geschäfte, ohne deine einzelnen Abos zu löschen." />
            </div>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Push auf diesem Gerät" />
        <CardBody><PushToggle vapidKey={env.vapid.publicKey} /></CardBody>
      </Card>

      <Card>
        <CardHeader title="Darstellung" />
        <CardBody><ThemeToggle /></CardBody>
      </Card>

      <Card id="privacy">
        <CardHeader title="Datenschutz & Einwilligungen" description="Du entscheidest pro Geschäft, ob es dir Angebote senden darf." />
        <CardBody className="space-y-2">
          {relations.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Verbindungen zu Geschäften.</p>
          ) : (
            relations.map((r) => <ConsentRow key={r.id} businessId={r.id} name={r.name} slug={r.slug} logo={fileUrl(r.logoPath)} granted={r.consent} text={consentText(r.name)} />)
          )}
          <div className="flex flex-wrap gap-3 pt-4">
            <a href="/api/me/export" className={buttonClass("outline", "sm")}><Download size={15} /> Meine Daten exportieren (JSON)</a>
            <Link href="/legal/privacy" className={buttonClass("ghost", "sm")}>Datenschutzhinweise</Link>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Passwort ändern" />
        <CardBody>
          <ActionForm action={changePasswordAction} submitLabel="Passwort ändern" submitVariant="outline">
            <Field label="Aktuelles Passwort" name="current"><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
            <Field label="Neues Passwort" name="next" hint="Mind. 10 Zeichen, Buchstaben und Zahlen. Alle Geräte werden abgemeldet."><Input id="next" name="next" type="password" autoComplete="new-password" required /></Field>
          </ActionForm>
        </CardBody>
      </Card>

      <Card className="border-danger/30">
        <CardHeader title="Konto löschen" description="Löscht dein Konto, deine Stempelkarten, Belohnungen, Bons und Einwilligungen endgültig. Geschäfte behalten nur anonyme Statistiken." />
        <CardBody>
          <ActionForm action={deleteAccountAction} submitLabel="Konto endgültig löschen" submitVariant="danger" confirm="Wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.">
            <Field label="Passwort" name="password"><Input id="del-password" name="password" type="password" required /></Field>
            <Field label='Tippe „LÖSCHEN“ zur Bestätigung' name="confirm"><Input id="confirm" name="confirm" required autoComplete="off" /></Field>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
