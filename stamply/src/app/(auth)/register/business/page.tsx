import Link from "next/link";
import { Badge } from "@/components/ui";
import { RegisterForm } from "../register-form";

export const metadata = { title: "Unternehmenskonto erstellen" };

export default async function RegisterBusinessPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <Badge tone="brand">Für Unternehmen</Badge>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Mehr Stammkund:innen. Ganz einfach.</h1>
      <p className="mt-2 text-muted">
        STAMPLY bringt neue Kund:innen in deinen Laden – und sorgt dafür, dass sie wiederkommen. Konto anlegen, Treuekarte gestalten, loslegen.
      </p>
      <RegisterForm accountType="business" next={next} />
      <p className="mt-4 text-center text-xs text-muted">
        Hinweis: Unternehmenskonten sind getrennt von Kundenkonten. Mit diesem Konto kannst du keine Stempel sammeln.
      </p>
      <p className="mt-4 text-center text-sm text-muted">
        Schon registriert? <Link href="/login" className="font-semibold text-brand hover:underline">Anmelden</Link>
      </p>
    </>
  );
}
