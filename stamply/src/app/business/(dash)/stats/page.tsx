import { BarChart } from "@/components/bar-chart";
import { ButtonLink, Card, CardBody, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { getDb } from "@/db";
import { listPrograms } from "@/domain/programs";
import { businessOverview, stampsBySource, stampsPerDay } from "@/domain/stats";
import { requireBusiness } from "@/lib/auth/session";
import { entitlements } from "@/lib/plans";
import { formatEuro } from "@/lib/time";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Statistiken" };

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const ctx = await requireBusiness("stats.view");
  const adv = entitlements(ctx.business.plan).advancedStats;
  const sp = await searchParams;
  const days = adv && ["7", "30", "90"].includes(sp.days ?? "") ? Number(sp.days) : 30;
  const db = getDb();
  const [s, series, sources, programs] = await Promise.all([
    businessOverview(db, ctx.userId, ctx.businessId, days),
    stampsPerDay(db, ctx.userId, ctx.businessId, days),
    stampsBySource(db, ctx.businessId, days),
    listPrograms(db, ctx.businessId),
  ]);
  const totalSrc = Object.values(sources).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiken"
        description="Alle Werte sind gezählte Messwerte aus STAMPLY. Schätzungen sind ausdrücklich gekennzeichnet."
        action={
          adv ? (
            <div className="inline-flex rounded-full bg-surface-2 p-1">
              {[7, 30, 90].map((d) => <Link key={d} href={`?days=${d}`} className={cn("rounded-full px-4 py-2 text-sm font-medium", days === d ? "bg-surface shadow-card" : "text-muted")}>{d} Tage</Link>)}
            </div>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vergebene Stempel" value={s.stamps.value} />
        <StatCard label="Neue Teilnehmer:innen" value={s.newParticipants.value} />
        <StatCard label="Wiederkehrende Kund:innen" value={s.returningCustomers.value} hint={s.returningRate != null ? `${s.returningRate} %` : undefined} />
        <StatCard label="Eingelöste Belohnungen" value={s.redeemed.value} />
        <StatCard label="Offene Belohnungen" value={s.openRewards.value} />
        <StatCard label="Profilaufrufe" value={s.profileViews.value} />
        <StatCard label="Push zugestellt" value={s.pushSent.value} />
        {s.estimatedRevenue ? <StatCard label="Umsatz mit Stempel" value={formatEuro(s.estimatedRevenue.value)} estimated hint="siehe Hinweis" /> : <StatCard label="Push geöffnet" value={s.pushOpened.value} />}
      </div>
      {s.estimatedRevenue && <Notice tone="warning" title="Zur Schätzung">{s.estimatedRevenue.note}. Stempel per Code enthalten keinen Betrag – die Schätzung kann daher abweichen.</Notice>}

      <Card>
        <CardHeader title="Stempel & Einlösungen pro Tag" description={`Letzte ${days} Tage`} />
        <CardBody><BarChart data={series} label="Stempel pro Tag" /></CardBody>
      </Card>

      {adv ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Stempel nach Quelle" />
            <CardBody className="space-y-3">
              {[["receipt", "Kassenbon"], ["code", "QR-/Kassencode"], ["manual", "Manuell"]].map(([k, l]) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-sm"><span>{l}</span><span className="font-semibold tabular-nums">{sources[k] ?? 0}</span></div>
                  <div className="h-2 rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand" style={{ width: `${((sources[k] ?? 0) / totalSrc) * 100}%` }} /></div>
                </div>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Programme" />
            <CardBody className="space-y-2 text-sm">
              {programs.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted">{p.participants} Teiln. · {p.stamps} Stempel · {p.rewardsRedeemed} eingelöst</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      ) : (
        <Notice tone="brand" title="Erweiterte Statistiken">Zeiträume, Quellen-Analyse und Programmvergleich gibt es ab dem Business-Tarif. <ButtonLink href="/business/billing" variant="ghost" size="sm">Tarife</ButtonLink></Notice>
      )}
    </div>
  );
}
