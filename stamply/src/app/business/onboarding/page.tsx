import Link from "next/link";
import { onboardingAction } from "@/app/actions/business";
import { ActionForm, Field } from "@/components/forms";
import { LocationFields } from "@/components/location-fields";
import { Card, CardBody, Input, Logo, Select } from "@/components/ui";
import { CATEGORIES } from "@/domain/businesses";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Unternehmen anlegen" };

export default async function OnboardingPage() {
  const user = await requireUser("business");
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/business"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Willkommen, {user.name.split(" ")[0]}! 👋</h1>
      <p className="mt-2 text-muted">In zwei Minuten ist dein Unternehmen startklar. Alles lässt sich später ändern.</p>
      <Card className="mt-6">
        <CardBody>
          <ActionForm action={onboardingAction} submitLabel="Unternehmen anlegen" fullWidthSubmit>
            <Field label="Name deines Geschäfts" name="name"><Input id="name" name="name" required placeholder="z. B. Café Bohne" /></Field>
            <Field label="Kategorie" name="category">
              <Select id="category" name="category" defaultValue="cafe">
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </Select>
            </Field>
            <LocationFields />
          </ActionForm>
        </CardBody>
      </Card>
      <p className="mt-4 text-center text-xs text-muted">Du startest im Starter-Tarif (Testmodus, keine Zahlung). Dein Profil ist erst sichtbar, wenn du es veröffentlichst.</p>
    </div>
  );
}
