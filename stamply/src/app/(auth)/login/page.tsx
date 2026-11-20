import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { ActionForm, Field } from "@/components/forms";
import { Input, Notice } from "@/components/ui";

export const metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Willkommen zurück</h1>
      <p className="mt-2 text-muted">Melde dich an, um Stempel zu sammeln oder dein Unternehmen zu verwalten.</p>
      <div className="mt-6 space-y-3">
        {sp.deleted && <Notice tone="success">Dein Konto und deine Daten wurden gelöscht.</Notice>}
        {sp.changed && <Notice tone="success">Passwort geändert. Bitte melde dich neu an.</Notice>}
      </div>
      <ActionForm action={loginAction} submitLabel="Anmelden" fullWidthSubmit className="mt-6">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <Field label="E-Mail" name="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Passwort" name="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-muted">
        Neu bei STAMPLY?{" "}
        <Link href={`/register${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-semibold text-brand hover:underline">
          Kostenlos registrieren
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Du hast ein Geschäft?{" "}
        <Link href="/register/business" className="font-semibold text-fg hover:underline">
          Unternehmenskonto erstellen
        </Link>
      </p>
    </>
  );
}
