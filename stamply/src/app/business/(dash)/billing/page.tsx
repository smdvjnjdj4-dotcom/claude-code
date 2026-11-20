import { Check } from "lucide-react";
import { PlanButton } from "@/components/plan-button";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import type { Plan } from "@/db/schema";
import { requireBusiness } from "@/lib/auth/session";
import { formatPrice, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata = { title: "Abonnement" };

export default async function BillingPage() {
  const ctx = await requireBusiness("billing.manage");
  const current = ctx.business.plan;
  return (
    <div className="space-y-6">
      <PageHeader title="Abonnement" description="Wähle den Tarif, der zu deinem Geschäft passt." />
      <Notice tone="warning" title="🧪 Testmodus – keine echten Zahlungen">
        Die Zahlungsabwicklung ist noch nicht angebunden. Ein Tarifwechsel schaltet hier nur Funktionen zum Ausprobieren frei. Es wird nichts berechnet und keine Zahlung simuliert.
      </Notice>
      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(PLANS) as Plan[]).map((id) => {
          const p = PLANS[id];
          const active = id === current;
          return (
            <Card key={id} className={cn("flex flex-col p-6", active && "border-brand ring-4 ring-brand/15", id === "business" && !active && "shadow-pop")}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">{p.name}</p>
                {active ? <Badge tone="brand">Aktueller Tarif</Badge> : id === "business" ? <Badge tone="success">Beliebt</Badge> : null}
              </div>
              <p className="mt-3"><span className="text-4xl font-bold tracking-tight">{formatPrice(p.priceCents)}</span><span className="text-muted"> / Monat</span></p>
              <p className="text-xs text-muted">zzgl. MwSt., monatlich kündbar (geplant)</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check size={17} className="shrink-0 text-success" /> {f}</li>)}
              </ul>
              <div className="mt-6">{active ? <p className="text-center text-sm font-medium text-muted">Aktiv</p> : <PlanButton plan={id} label={`${p.name} testen`} />}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
