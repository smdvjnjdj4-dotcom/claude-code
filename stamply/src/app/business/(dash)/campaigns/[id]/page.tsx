import { notFound } from "next/navigation";
import { CampaignBuilder } from "@/components/campaign-builder";
import { CampaignStatusButtons } from "@/components/status-buttons";
import { Badge, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { listPrograms } from "@/domain/programs";
import { SEGMENTS, segmentCounts } from "@/domain/push/audiences";
import { deliveryLog, getCampaign } from "@/domain/push/campaigns";
import { SKIP_LABELS, type SkipReason } from "@/domain/push/policy";
import { requireBusiness } from "@/lib/auth/session";
import { isDomainError } from "@/lib/errors";
import { entitlements } from "@/lib/plans";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Kampagne" };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireBusiness("campaigns.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const c = await getCampaign(db, ctx.userId, ctx.businessId, id).catch((e) => {
    if (isDomainError(e)) notFound();
    throw e;
  });
  const e = entitlements(ctx.business.plan);
  const [log, counts, programs] = await Promise.all([deliveryLog(db, ctx.userId, ctx.businessId, id), segmentCounts(db, ctx.businessId), listPrograms(db, ctx.businessId)]);
  const reasons = log.filter((l) => l.status === "skipped").reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.reason!]: (acc[l.reason!] ?? 0) + 1 }), {});

  return (
    <div className="space-y-6">
      <PageHeader title={c.name} back="/business/campaigns" action={<CampaignStatusButtons id={c.id} status={c.status} />} />
      <Card>
        <CardHeader title="Versandprotokoll" description="Jede Zustellung und jede bewusste Nicht-Zustellung wird protokolliert (ohne Personendaten)." />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{log.filter((l) => l.status === "sent").length} zugestellt</Badge>
            <Badge tone="neutral">{log.filter((l) => l.pushSent > 0).length} davon auch per Gerät-Push</Badge>
            {Object.entries(reasons).map(([r, n]) => <Badge key={r} tone="warning">{n}× {SKIP_LABELS[r as SkipReason] ?? r}</Badge>)}
          </div>
          {log.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-line text-sm">
              {log.slice(0, 100).map((l) => (
                <div key={l.id} className="flex justify-between gap-3 border-b border-line px-4 py-2 last:border-0">
                  <span className="text-muted">{formatDateTime(l.createdAt)}</span>
                  <span>{l.status === "sent" ? "Zugestellt" : `Zurückgehalten: ${SKIP_LABELS[l.reason as SkipReason] ?? l.reason}`}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
      {c.status !== "sent" && (
        <Card>
          <CardHeader title="Bearbeiten" />
          <CardBody>
            <CampaignBuilder
              initial={c}
              segments={SEGMENTS.map((s) => ({ ...s, reachable: counts[s.id].reachable }))}
              programs={programs.filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.name }))}
              ent={{ recurring: e.recurringCampaigns, basic: e.basicAutomations, advanced: e.advancedAutomations }}
              businessName={ctx.business.name}
              slug={ctx.business.slug}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
