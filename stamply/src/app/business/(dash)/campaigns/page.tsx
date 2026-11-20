import { Plus } from "lucide-react";
import Link from "next/link";
import { CampaignStatusButtons } from "@/components/status-buttons";
import { Badge, ButtonLink, Card, EmptyState, Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { listCampaigns, runsThisMonth, TRIGGERS } from "@/domain/push/campaigns";
import { SEGMENTS } from "@/domain/push/audiences";
import { requireBusiness } from "@/lib/auth/session";
import { entitlements } from "@/lib/plans";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Push-Kampagnen" };

const STATUS = {
  draft: ["Entwurf", "neutral"], scheduled: ["Geplant", "brand"], active: ["Aktiv", "success"], paused: ["Pausiert", "warning"], sent: ["Versendet", "neutral"], archived: ["Gelöscht", "neutral"],
} as const;

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const ctx = await requireBusiness("campaigns.manage");
  const { saved } = await searchParams;
  const e = entitlements(ctx.business.plan);
  const [list, runs] = await Promise.all([listCampaigns(getDb(), ctx.userId, ctx.businessId), runsThisMonth(getDb(), ctx.businessId)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Push-Kampagnen"
        description="Erreiche Kund:innen, die deine Updates abonniert haben – manuell, wiederkehrend oder automatisch."
        action={e.manualPush ? <ButtonLink href="/business/campaigns/new"><Plus size={18} /> Neue Kampagne</ButtonLink> : undefined}
      />
      {saved && <Notice tone="success">Kampagne gespeichert.</Notice>}
      {!e.manualPush ? (
        <EmptyState icon="📣" title="Push-Kampagnen ab dem Business-Tarif" description="Hol Kund:innen mit Erinnerungen und Aktionen zurück – nur an Personen, die zugestimmt haben." action={<ButtonLink href="/business/billing">Tarife ansehen</ButtonLink>} />
      ) : (
        <>
          <p className="text-sm text-muted">Kampagnenläufe diesen Monat: <b className="text-fg">{runs} / {e.monthlyCampaignRuns}</b> (einmalig & wiederkehrend; Automationen zählen nicht)</p>
          {list.length === 0 ? (
            <EmptyState icon="📣" title="Noch keine Kampagnen" description="Tipp: Starte mit der Automation „Nur noch 1 Stempel“ – sie bringt Kund:innen genau im richtigen Moment zurück." action={<ButtonLink href="/business/campaigns/new">Erste Kampagne erstellen</ButtonLink>} />
          ) : (
            <div className="space-y-3">
              {list.map((c) => (
                <Card key={c.id} className="flex flex-wrap items-center gap-4 p-5">
                  <Link href={`/business/campaigns/${c.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{c.name}</p>
                      <Badge tone={STATUS[c.status][1]}>{STATUS[c.status][0]}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {c.type === "trigger" ? `Automatisch · ${TRIGGERS[c.trigger!].label}` : `${c.type === "manual" ? "Einmalig" : `Alle ${c.intervalDays} Tage`} · ${SEGMENTS.find((s) => s.id === c.audience.segment)?.label}`}
                      {c.type !== "trigger" && c.status === "scheduled" && c.scheduledAt ? ` · ${formatDateTime(c.scheduledAt)}` : ""}
                      {c.type === "recurring" && c.status === "active" && c.nextRunAt ? ` · nächster Lauf ${formatDateTime(c.nextRunAt)}` : ""}
                    </p>
                    <p className="mt-1 truncate text-sm">„{c.title}“</p>
                  </Link>
                  <div className="text-right text-sm">
                    <p><b className="tabular-nums">{c.sent}</b> <span className="text-muted">zugestellt</span></p>
                    <p className="text-xs text-muted">{c.skipped} vom Spam-Schutz zurückgehalten</p>
                  </div>
                  <CampaignStatusButtons id={c.id} status={c.status} />
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
