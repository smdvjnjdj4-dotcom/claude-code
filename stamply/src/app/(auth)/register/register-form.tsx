import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { ActionForm, Field } from "@/components/forms";
import { Input } from "@/components/ui";

export function RegisterForm({ accountType, next }: { accountType: "customer" | "business"; next?: string }) {
  return (
    <ActionForm action={registerAction} submitLabel="Konto erstellen" fullWidthSubmit className="mt-6">
      <input type="hidden" name="accountType" value={accountType} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={accountType === "business" ? "Dein Name" : "Name"} name="name">
        <Input id="name" name="name" autoComplete="name" required minLength={2} />
      </Field>
      <Field label="E-Mail" name="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Passwort" name="password" hint="Mindestens 10 Zeichen, Buchstaben und Zahlen.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
        <span>
          Ich akzeptiere die <Link href="/legal/terms" className="underline">Nutzungsbedingungen</Link> und habe die{" "}
          <Link href="/legal/privacy" className="underline">Datenschutzhinweise</Link> gelesen.
        </span>
      </label>
    </ActionForm>
  );
}
