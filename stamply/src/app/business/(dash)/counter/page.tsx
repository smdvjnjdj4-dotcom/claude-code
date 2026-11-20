import { redeemAction } from "@/app/actions/business";
import { CodeGenerator } from "@/components/counter";
import { ActionForm } from "@/components/forms";
import { ButtonLink, Card, CardBody, CardHeader, EmptyState, Input, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { listLocations } from "@/domain/businesses";
import { listPrograms } from "@/domain/programs";
import { requireBusiness } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export const metadata = { title: "Kasse" };

export default async function CounterPage() {
  const ctx = await requireBusiness("stamps.issue");
  const [programs, locations] = await Promise.all([listPrograms(getDb(), ctx.businessId), listLocations(getDb(), ctx.businessId)]);
  const active = programs.filter((p) => p.status === "active");
  return (
    <div className="space-y-6">
      <PageHeader title="Kasse" description="Stempel per QR-Code vergeben und Belohnungen einlösen." />
      <Card>
        <CardHeader title="Stempel vergeben" description="Dynamischer Einmal-Code – die sicherste Alternative zum Kassenbon." />
        <CardBody>
          {active.length ? (
            <CodeGenerator programs={active.map((p) => ({ id: p.id, name: p.name }))} locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
          ) : (
            <EmptyState icon="🎟️" title="Kein aktives Treueprogramm" description="Aktiviere zuerst ein Treueprogramm." action={can(ctx.role, "programs.manage") ? <ButtonLink href="/business/programs/new">Programm erstellen</ButtonLink> : undefined} />
          )}
        </CardBody>
      </Card>
      {can(ctx.role, "rewards.redeem") && (
        <Card>
          <CardHeader title="Belohnung einlösen" description="Code aus der App der Kundin/des Kunden eingeben. Jeder Code ist nur einmal gültig." />
          <CardBody>
            <ActionForm action={redeemAction} submitLabel="Einlösen" resetOnSuccess className="max-w-md">
              <Input name="code" required placeholder="z. B. 7KQ3M9PX" autoComplete="off" autoCapitalize="characters" className="h-14 font-mono text-xl tracking-[0.25em] uppercase" aria-label="Belohnungscode" />
            </ActionForm>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
