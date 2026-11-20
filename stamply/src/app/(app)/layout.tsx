import { Bell, Compass, Gift, Home, Map, Stamp, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { unreadCount } from "@/domain/customers";
import { getCurrentUser } from "@/lib/auth/session";
import { fileUrl } from "@/lib/storage";
import { TabLink, TopNavLink } from "@/components/nav";
import { Avatar, ButtonLink, Logo } from "@/components/ui";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user?.accountType === "business") redirect("/business");
  const unread = user ? await unreadCount(getDb(), user.id) : 0;

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <header className="sticky top-0 z-40 hidden border-b border-line bg-bg/80 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <Link href="/" aria-label="Startseite">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1">
            <TopNavLink href="/" exact>Entdecken</TopNavLink>
            <TopNavLink href="/explore">Karte & Suche</TopNavLink>
            {user && <TopNavLink href="/cards">Meine Stempel</TopNavLink>}
            {user && <TopNavLink href="/rewards">Belohnungen</TopNavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2" aria-label="Benachrichtigungen">
                  <Bell size={20} />
                  {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-danger" />}
                </Link>
                <Link href="/profile" aria-label="Profil">
                  <Avatar name={user.name} src={fileUrl(user.avatarPath)} size={36} />
                </Link>
              </>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">Anmelden</ButtonLink>
                <ButtonLink href="/register" size="sm">Kostenlos starten</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl md:hidden safe-bottom" aria-label="Hauptnavigation">
        <div className="mx-auto flex max-w-md px-2 pt-1">
          <TabLink href="/" exact icon={<Home size={21} />} label="Start" />
          <TabLink href="/explore" icon={<Map size={21} />} label="Karte" />
          <TabLink href={user ? "/cards" : "/login?next=/cards"} icon={<Stamp size={21} />} label="Stempel" />
          <TabLink href={user ? "/rewards" : "/login?next=/rewards"} icon={<Gift size={21} />} label="Belohnungen" />
          <TabLink href={user ? "/profile" : "/login"} icon={user ? <User size={21} /> : <Compass size={21} />} label={user ? "Profil" : "Anmelden"} badge={unread} />
        </div>
      </nav>
    </div>
  );
}
