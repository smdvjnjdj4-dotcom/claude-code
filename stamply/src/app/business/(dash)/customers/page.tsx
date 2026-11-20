import { BellRing } from "lucide-react";
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { SEGMENTS, segmentCounts } from "@/domain/push/audiences";
import { customerList } from "@/domain/stats";
import { requireBusiness } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { formatDate, relativeTime } from "@/lib/time";

export const metadata = { title: "Kundenbindung" };

export default async function CustomersPage() {
  const ctx = await requireBusiness("customers.view");
  const [counts, customers] = await Promise.all([segmentCounts(getDb(), ctx.businessId), customerList(getDb(), ctx.userId, ctx.businessId)]);
  return (
    <div className="space-y-6">
      <PageHeader title="Kundenbindung" description="Zielgruppen aktualisieren sich automatisch anhand echter Besuche. Erreichbar sind nur Kund:innen mit Einwilligung." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SEGMENTS.map((s) => (
          <Card key={s.id} className="flex flex-col p-5">
            <p className="font-semibold">{s.label}</p>
            <p className="mt-0.5 text-sm text-muted">{s.description}</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold tabular-nums">{counts[s.id].total}</p>
                <p className="flex items-center gap-1 text-xs text-muted"><BellRing size={12} /> {counts[s.id].reachable} erreichbar</p>
              </div>
              {can(ctx.role, "campaigns.manage") && counts[s.id].reachable > 0 && (
                <ButtonLink href={`/business/campaigns/new?segment=${s.id}`} variant="soft" size="sm">Nachricht</ButtonLink>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Kund:innen" description="Pseudonymisiert: nur Vorname und Initial. Keine Kontaktdaten – Kontakt nur über Push mit Einwilligung." />
        <CardBody className="p-0 sm:p-0">
          {customers.length === 0 ? (
            <div className="p-6"><EmptyState icon="👋" title="Noch keine Kund:innen" description="Sobald jemand bei dir Stempel sammelt, erscheint er/sie hier." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 font-medium">Kund:in</th>
                    <th className="px-3 py-3 font-medium">Besuchstage</th>
                    <th className="px-3 py-3 font-medium">Stempel</th>
                    <th className="px-3 py-3 font-medium">Eingelöst</th>
                    <th className="px-3 py-3 font-medium">Letzter Besuch</th>
                    <th className="px-5 py-3 font-medium">Updates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3 font-medium">{c.displayName}<span className="block text-xs font-normal text-muted">seit {formatDate(c.firstVisit)}</span></td>
                      <td className="px-3 py-3 tabular-nums">{c.visitDays}</td>
                      <td className="px-3 py-3 tabular-nums">{c.stampsTotal}</td>
                      <td className="px-3 py-3 tabular-nums">{c.redeemed}</td>
                      <td className="px-3 py-3 text-muted">{relativeTime(c.lastVisit)}</td>
                      <td className="px-5 py-3">{c.subscribed ? <Badge tone="success">Abonniert</Badge> : <Badge>–</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
