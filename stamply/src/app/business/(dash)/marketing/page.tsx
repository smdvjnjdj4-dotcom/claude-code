import { createOfferAction } from "@/app/actions/business";
import { ActionForm, Field } from "@/components/forms";
import { OfferControls } from "@/components/offer-controls";
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, Input, Notice, PageHeader, Switch, Textarea } from "@/components/ui";
import { getDb } from "@/db";
import { listOffers } from "@/domain/programs";
import { segmentCounts } from "@/domain/push/audiences";
import { requireBusiness } from "@/lib/auth/session";
import { entitlements } from "@/lib/plans";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const ctx = await requireBusiness("offers.manage");
  const e = entitlements(ctx.business.plan);
  const [offers, counts] = await Promise.all([listOffers(getDb(), ctx.businessId), segmentCounts(getDb(), ctx.businessId)]);

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" description="Aktionen auf deinem Profil und in der Entdeckung – plus deine Reichweite für Push." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-muted">Push-Abonnent:innen</p>
          <p className="mt-1 text-3xl font-bold">{counts.all_consented.reachable}</p>
          <p className="mt-1 text-xs text-muted">haben deinen Updates zugestimmt</p>
        </Card>
        <Card className="p-5 sm:col-span-2">
          <p className="font-semibold">Mehr Abonnent:innen gewinnen</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Weise beim Stempeln auf „Updates abonnieren“ in deinem STAMPLY-Profil hin.</li>
            <li>Biete eine Neukunden-Aktion an – sie erscheint prominent in der Entdeckung.</li>
            <li>Sende selten, aber relevant: Spam-Schutz und Abmeldungen schützen deine Reichweite.</li>
          </ul>
        </Card>
      </div>

      {!e.offers ? (
        <Notice tone="brand" title="Aktionen & Angebote ab Business-Tarif">
          Mit Aktionen wie „Erster Kaffee 50 % günstiger“ fällst du in der Entdeckung auf. <ButtonLink href="/business/billing" variant="ghost" size="sm">Tarife ansehen</ButtonLink>
        </Notice>
      ) : (
        <Card>
          <CardHeader title="Neue Aktion" description="Wird auf deinem Profil und in „Aktionen & Angebote“ angezeigt." />
          <CardBody>
            <ActionForm action={createOfferAction} submitLabel="Aktion veröffentlichen" resetOnSuccess>
              <Field label="Titel" name="title"><Input id="title" name="title" required maxLength={80} placeholder="z. B. Erster Cappuccino 50 % günstiger" /></Field>
              <Field label="Beschreibung" name="description"><Textarea id="description" name="description" rows={2} maxLength={400} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start (optional)" name="startsAt"><Input id="startsAt" name="startsAt" type="date" /></Field>
                <Field label="Ende (optional)" name="endsAt"><Input id="endsAt" name="endsAt" type="date" /></Field>
              </div>
              <Switch name="newCustomersOnly" label="Nur für Neukund:innen" description="Wird als Neukunden-Aktion hervorgehoben." />
            </ActionForm>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Deine Aktionen" />
        <CardBody>
          {offers.length === 0 ? (
            <EmptyState icon="🏷️" title="Noch keine Aktionen" />
          ) : (
            <div className="divide-y divide-line">
              {offers.map((o) => (
                <div key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{o.title} {o.newCustomersOnly && <Badge tone="brand">Neukunden</Badge>}</p>
                    <p className="text-sm text-muted">{o.startsAt ? `ab ${formatDate(o.startsAt)}` : "sofort"}{o.endsAt ? ` · bis ${formatDate(o.endsAt)}` : ""}</p>
                  </div>
                  <OfferControls id={o.id} active={o.active} />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
      <p className="text-center text-xs text-muted">Hinweis: Die Reihenfolge in der Entdeckung ist nicht käuflich. Gesponserte Platzierungen (später) werden klar als „Anzeige“ gekennzeichnet.</p>
    </div>
  );
}
