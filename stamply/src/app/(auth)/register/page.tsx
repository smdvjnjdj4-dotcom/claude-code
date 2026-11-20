import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Registrieren" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Konto erstellen</h1>
      <p className="mt-2 text-muted">Sammle Stempel bei deinen Lieblingsgeschäften und schalte Belohnungen frei. Kostenlos.</p>
      <RegisterForm accountType="customer" next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        Schon dabei?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">Anmelden</Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Für Geschäfte:{" "}
        <Link href="/register/business" className="font-semibold text-fg hover:underline">Unternehmenskonto</Link>
      </p>
    </>
  );
}
