import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" aria-label="STAMPLY Startseite">
          <Logo />
        </Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 animate-fade-up">{children}</main>
        <p className="text-center text-xs text-muted">
          <Link href="/legal/privacy" className="hover:underline">Datenschutz</Link> · <Link href="/legal/terms" className="hover:underline">Nutzungsbedingungen</Link> · <Link href="/legal/imprint" className="hover:underline">Impressum</Link>
        </p>
      </div>
      <aside className="relative hidden overflow-hidden bg-[radial-gradient(120%_80%_at_80%_0%,#8b6dff_0%,#5532f0_45%,#1b0f5c_100%)] p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[40px] border-dashed border-white/10" />
        <div className="absolute right-24 top-48 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Discover Local. Earn Rewards.</p>
        <h2 className="mt-4 max-w-md text-4xl font-bold leading-tight tracking-tight">
          Deine Lieblingsorte. Deine Stempel. Deine Belohnungen.
        </h2>
        <p className="mt-4 max-w-md text-white/75">
          Entdecke Cafés, Restaurants, Barber und Studios in deiner Nähe – und werde mit jedem Besuch belohnt.
        </p>
      </aside>
    </div>
  );
}
