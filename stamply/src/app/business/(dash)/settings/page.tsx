import { Download, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { deleteBusinessAction, saveSettingsAction } from "@/app/actions/business";
import { changePasswordAction, deleteAccountAction } from "@/app/actions/customer";
import { ThemeToggle } from "@/components/client";
import { ActionForm, Field } from "@/components/forms";
import { Button, buttonClass, Card, CardBody, CardHeader, Input, PageHeader, Textarea } from "@/components/ui";
import { requireBusiness } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export const metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const ctx = await requireBusiness();
  const b = ctx.business;
  return (
    <div className="space-y-6">
      <PageHeader title="Einstellungen" />
      {can(ctx.role, "business.edit") && (
        <Card>
          <CardHeader title="Bon-Prüfung" description="Wie sollen eingereichte Kassenbons behandelt werden?" />
          <CardBody>
            <ActionForm action={saveSettingsAction} submitLabel="Speichern">
              <fieldset className="space-y-2">
                {[
                  ["auto_low_risk", "Automatisch bei geringem Risiko (empfohlen)", "Eindeutige Bons (Name, aktuelles Datum, Betrag erkannt, kein Duplikat) werden sofort bestätigt. Alles andere prüfst du."],
                  ["always_manual", "Immer manuell prüfen", "Jeder Bon wartet auf deine Freigabe. Sicherer, aber Kund:innen warten länger."],
                ].map(([v, l, d]) => (
                  <label key={v} className="flex cursor-pointer gap-3 rounded-2xl border border-line p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                    <input type="radio" name="receiptReviewMode" value={v} defaultChecked={b.receiptReviewMode === v} className="mt-1 accent-[var(--brand)]" />
                    <span><span className="block font-semibold">{l}</span><span className="text-sm text-muted">{d}</span></span>
                  </label>
                ))}
              </fieldset>
              <Field label="Name auf dem Kassenbon (Alternativen)" name="receiptAliases" hint="Falls dein Bon einen anderen Namen zeigt, z. B. die GmbH. Ein Name pro Zeile, max. 5.">
                <Textarea id="receiptAliases" name="receiptAliases" rows={3} defaultValue={b.receiptAliases.join("\n")} placeholder={"Bohne & Co. GmbH"} />
              </Field>
            </ActionForm>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Darstellung" />
        <CardBody><ThemeToggle /></CardBody>
      </Card>

      <Card>
        <CardHeader title="Dein Konto" description={`${ctx.user.name} · ${ctx.user.email}`} />
        <CardBody className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <a href="/api/me/export" className={buttonClass("outline", "sm")}><Download size={15} /> Meine Daten exportieren</a>
            <form action={logoutAction}><Button variant="outline" size="sm"><LogOut size={15} /> Abmelden</Button></form>
          </div>
          <ActionForm action={changePasswordAction} submitLabel="Passwort ändern" submitVariant="outline" className="max-w-md">
            <Field label="Aktuelles Passwort" name="current"><Input id="current" name="current" type="password" required /></Field>
            <Field label="Neues Passwort" name="next"><Input id="next" name="next" type="password" required /></Field>
          </ActionForm>
        </CardBody>
      </Card>

      {ctx.role === "owner" && (
        <Card className="border-danger/30">
          <CardHeader title="Unternehmen löschen" description="Löscht Profil, Programme, Stempel, Belohnungen, Bons und Kampagnen dieses Unternehmens endgültig." />
          <CardBody>
            <ActionForm action={deleteBusinessAction} submitLabel="Unternehmen endgültig löschen" submitVariant="danger" confirm="Wirklich endgültig löschen?" className="max-w-md">
              <Field label={`Zur Bestätigung „${b.name}“ eintippen`} name="confirmName"><Input id="confirmName" name="confirmName" required autoComplete="off" /></Field>
            </ActionForm>
          </CardBody>
        </Card>
      )}

      <Card className="border-danger/30">
        <CardHeader title="Konto löschen" description="Als alleinige:r Inhaber:in musst du zuerst das Unternehmen löschen." />
        <CardBody>
          <ActionForm action={deleteAccountAction} submitLabel="Konto löschen" submitVariant="danger" confirm="Konto endgültig löschen?" className="max-w-md">
            <Field label="Passwort" name="password"><Input id="del-pw" name="password" type="password" required /></Field>
            <Field label="Tippe „LÖSCHEN“" name="confirm"><Input id="del-confirm" name="confirm" required autoComplete="off" /></Field>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
