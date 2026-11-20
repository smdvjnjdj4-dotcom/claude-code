import { ArrowRight, Check, Gift, QrCode, Receipt, Send } from "lucide-react";
import Link from "next/link";
import { BarChart } from "@/components/bar-chart";
import { Badge, ButtonLink, Card, CardBody, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { getDb } from "@/db";
import { listLocations } from "@/domain/businesses";
import { listPrograms } from "@/domain/programs";
import { businessOverview, stampsPerDay } from "@/domain/stats";
import { requireBusiness } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatEuro } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Übersicht" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireBusiness();
  const db = getDb();
  const b = ctx.business;
  const canStats = can(ctx.role, "stats.view");

  const [stats, series, programs, locations] = await Promise.all([
    canStats ? businessOverview(db, ctx.userId, b.id, 30) : null,
    canStats ? stampsPerDay(db, ctx.userId, b.id, 30) : null,
    listPrograms(db, b.id),
    listLocations(db, b.id),
  ]);

  const checklist = [
    { done: !!b.logoPath, label: "Logo hochladen", href: "/business/profile" },
    { done: b.description.length > 20, label: "Beschreibung ergänzen", href: "/business/profile" },
    { done: locations.some((l) => l.lat != null), label: "Standort auf der Karte setzen", href: "/business/profile" },
    { done: programs.some((p) => p.status === "active"), label: "Treueprogramm aktivieren", href: "/business/programs" },
    { done: b.published, label: "Profil veröffentlichen", href: "/business/profile" },
  ];
  const setupDone = checklist.every((c) => c.done);

  return (
    <div className="space-y-6">
      <PageHeader
        title={sp.welcome ? `Willkommen bei STAMPLY, ${b.name}!` : `Hallo ${ctx.user.name.split(" ")[0]} 👋`}
        description={`Die letzten 30 Tage bei ${b.name} auf einen Blick.`}
        action={can(ctx.role, "stamps.issue") ? <ButtonLink href="/business/counter"><QrCode size={18} /> Stempel vergeben</ButtonLink> : undefined}
      />
      {sp.denied && <Notice tone="warning">Für diesen Bereich fehlt deiner Rolle die Berechtigung.</Notice>}
      {b.billingMode === "test" && <Notice tone="neutral">🧪 Testmodus: Tarife lassen sich ohne Zahlung ausprobieren. Es werden keine echten Zahlungen abgewickelt.</Notice>}

      {!setupDone && can(ctx.role, "business.edit") && (
        <Card>
          <CardHeader title="Startklar machen" description={`${checklist.filter((c) => c.done).length} von ${checklist.length} Schritten erledigt`} />
          <CardBody className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {checklist.map((c) => (
              <Link key={c.label} href={c.href} className={cn("flex items-center gap-3 rounded-2xl border border-line p-3 text-sm font-medium transition hover:bg-surface-2", c.done && "opacity-60")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", c.done ? "bg-success text-white" : "border-2 border-dashed border-surface-3")}>{c.done && <Check size={14} />}</span>
                <span className={cn(c.done && "line-through")}>{c.label}</span>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}

      {stats && (
        <>
          {stats.receiptsPending > 0 && can(ctx.role, "receipts.review") && (
            <Link href="/business/receipts" className="flex items-center justify-between gap-4 rounded-3xl bg-warning-soft px-5 py-4 font-medium">
              <span className="flex items-center gap-3"><Receipt size={20} className="text-warning" /> {stats.receiptsPending} Kassenbon{stats.receiptsPending > 1 ? "s" : ""} warten auf deine Prüfung</span>
              <ArrowRight size={18} />
            </Link>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Aktive Teilnehmer:innen" value={stats.activeParticipants.value} hint="letzte 90 Tage" />
            <StatCard label="Neue Teilnehmer:innen" value={stats.newParticipants.value} />
            <StatCard label="Vergebene Stempel" value={stats.stamps.value} />
            <StatCard label="Eingelöste Belohnungen" value={stats.redeemed.value} />
            <StatCard label="Wiederkehrende Kund:innen" value={stats.returningCustomers.value} hint={stats.returningRate != null ? `${stats.returningRate} % der Kund:innen` : undefined} />
            <StatCard label="Profilaufrufe" value={stats.profileViews.value} hint="eindeutig/Tag" />
            <StatCard label="Aktive Kampagnen" value={stats.activeCampaigns.value} />
            <StatCard label="Push-Abonnent:innen" value={stats.subscribers.value} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader title="Stempel pro Tag" description="Letzte 30 Tage" />
              <CardBody>{series && <BarChart data={series} label="Stempel pro Tag" />}</CardBody>
            </Card>
            <Card>
              <CardHeader title="Benachrichtigungen" description="Marketing-Push, letzte 30 Tage" />
              <CardBody className="space-y-3 text-sm">
                <Row label="Zugestellt" value={stats.pushSent.value} />
                <Row label="In der App geöffnet" value={stats.pushOpened.value} />
                <Row label="Vom Spam-Schutz zurückgehalten" value={stats.pushSkipped.value} />
                <div className="border-t border-line pt-3">
                  {stats.estimatedRevenue ? (
                    <div>
                      <div className="flex items-center gap-2"><span className="font-semibold">{formatEuro(stats.estimatedRevenue.value)}</span><Badge tone="warning">Schätzung</Badge></div>
                      <p className="mt-1 text-xs text-muted">{stats.estimatedRevenue.note}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted">Eine Umsatzschätzung erscheint, sobald mind. 5 Kassenbons mit erkanntem Betrag bestätigt wurden.</p>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {can(ctx.role, "rewards.redeem") && <Quick href="/business/rewards" icon={<Gift />} title="Belohnung einlösen" text="Code der Kundin/des Kunden eingeben" />}
        {can(ctx.role, "receipts.review") && <Quick href="/business/receipts" icon={<Receipt />} title="Bons prüfen" text="Unklare Einreichungen freigeben" />}
        {can(ctx.role, "campaigns.manage") && <Quick href="/business/campaigns/new" icon={<Send />} title="Push senden" text="Abonnent:innen erreichen" />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Quick({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="pressable flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 shadow-card hover:shadow-pop">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
    </Link>
  );
}
