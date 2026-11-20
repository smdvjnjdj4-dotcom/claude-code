import {
  BarChart3,
  Building2,
  CreditCard,
  Gift,
  HeartHandshake,
  LayoutDashboard,
  Megaphone,
  QrCode,
  Receipt,
  Send,
  Settings,
  Stamp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { membershipsForUser } from "@/domain/businesses";
import { requireBusiness } from "@/lib/auth/session";
import { can, ROLE_LABEL, type Permission } from "@/lib/permissions";
import { PLANS } from "@/lib/plans";
import { fileUrl } from "@/lib/storage";
import { SideNavLink } from "@/components/nav";
import { BusinessSwitcher } from "@/components/business-switcher";
import { Avatar, Badge, Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/client";
import { sql } from "drizzle-orm";

type Item = { href: string; label: string; icon: React.ReactNode; perm?: Permission; exact?: boolean; badge?: number };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireBusiness();
  const db = getDb();
  const [memberships, [{ pending }]] = await Promise.all([
    membershipsForUser(db, ctx.userId),
    db.execute<{ pending: number }>(sql`select count(*)::int as pending from receipts where business_id = ${ctx.businessId} and status = 'needs_review'`),
  ]);

  const items: Item[] = [
    { href: "/business", label: "Übersicht", icon: <LayoutDashboard size={19} />, exact: true },
    { href: "/business/counter", label: "Kasse", icon: <QrCode size={19} />, perm: "stamps.issue" },
    { href: "/business/profile", label: "Mein Unternehmen", icon: <Building2 size={19} />, perm: "business.edit" },
    { href: "/business/programs", label: "Treueprogramme", icon: <Stamp size={19} />, perm: "programs.manage" },
    { href: "/business/rewards", label: "Belohnungen", icon: <Gift size={19} />, perm: "rewards.redeem" },
    { href: "/business/receipts", label: "Bon-Prüfung", icon: <Receipt size={19} />, perm: "receipts.review", badge: Number(pending) },
    { href: "/business/customers", label: "Kundenbindung", icon: <HeartHandshake size={19} />, perm: "customers.view" },
    { href: "/business/marketing", label: "Marketing", icon: <Megaphone size={19} />, perm: "offers.manage" },
    { href: "/business/campaigns", label: "Push-Kampagnen", icon: <Send size={19} />, perm: "campaigns.manage" },
    { href: "/business/stats", label: "Statistiken", icon: <BarChart3 size={19} />, perm: "stats.view" },
    { href: "/business/team", label: "Mitarbeiter", icon: <Users size={19} /> },
    { href: "/business/settings", label: "Einstellungen", icon: <Settings size={19} /> },
    { href: "/business/billing", label: "Abonnement", icon: <CreditCard size={19} />, perm: "billing.manage" },
  ];
  const visible = items.filter((i) => !i.perm || can(ctx.role, i.perm));
  const mobile = visible.filter((i) => ["/business", "/business/counter", "/business/receipts", "/business/campaigns", "/business/settings"].includes(i.href));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href="/business" className="px-2"><Logo /></Link>
        <Badge tone="brand" className="ml-2 mt-1 w-fit">Business</Badge>
        <div className="mt-5">
          <BusinessSwitcher current={ctx.businessId} options={memberships.map((m) => ({ id: m.businessId, name: m.name, logo: fileUrl(m.logoPath) }))} />
        </div>
        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto" aria-label="Dashboard">
          {visible.map((i) => <SideNavLink key={i.href} {...i} />)}
        </nav>
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={ctx.user.name} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{ctx.user.name}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABEL[ctx.role]} · {PLANS[ctx.business.plan].name}</p>
            </div>
          </div>
          <ThemeToggle compact />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-xl lg:hidden">
          <Link href="/business"><Logo className="[&>span]:text-base" /></Link>
          <div className="ml-auto min-w-0 max-w-[55%]">
            <BusinessSwitcher current={ctx.businessId} options={memberships.map((m) => ({ id: m.businessId, name: m.name, logo: fileUrl(m.logoPath) }))} compact />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl lg:hidden safe-bottom" aria-label="Dashboard">
          <div className="flex overflow-x-auto px-2 pt-1">
            {mobile.map((i) => (
              <Link key={i.href} href={i.href} className="flex min-w-[64px] flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium text-muted">
                <span className="relative flex h-8 items-center">{i.icon}{!!i.badge && <span className="absolute -right-2 top-0 h-2 w-2 rounded-full bg-danger" />}</span>
                {i.label}
              </Link>
            ))}
            <Link href="/business/more" className="flex min-w-[64px] flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium text-muted">
              <span className="flex h-8 items-center text-lg leading-none">⋯</span>Mehr
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
