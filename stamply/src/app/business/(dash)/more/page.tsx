import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Button, PageHeader } from "@/components/ui";
import { requireBusiness } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

const LINKS = [
  ["/business/profile", "Mein Unternehmen", "business.edit"],
  ["/business/programs", "Treueprogramme", "programs.manage"],
  ["/business/rewards", "Belohnungen", "rewards.redeem"],
  ["/business/customers", "Kundenbindung", "customers.view"],
  ["/business/marketing", "Marketing", "offers.manage"],
  ["/business/stats", "Statistiken", "stats.view"],
  ["/business/team", "Mitarbeiter", null],
  ["/business/billing", "Abonnement", "billing.manage"],
] as const;

export default async function MorePage() {
  const ctx = await requireBusiness();
  return (
    <div>
      <PageHeader title="Mehr" />
      <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        {LINKS.filter(([, , p]) => !p || can(ctx.role, p)).map(([href, label]) => (
          <Link key={href} href={href} className="flex items-center justify-between px-5 py-4 font-medium hover:bg-surface-2">{label}<span className="text-muted">›</span></Link>
        ))}
      </div>
      <form action={logoutAction} className="mt-6"><Button variant="outline">Abmelden</Button></form>
    </div>
  );
}
