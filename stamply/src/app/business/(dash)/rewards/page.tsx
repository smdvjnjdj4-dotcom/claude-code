import { desc, eq, sql } from "drizzle-orm";
import { redeemAction } from "@/app/actions/business";
import { ActionForm } from "@/components/forms";
import { Badge, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, StatCard } from "@/components/ui";
import { getDb } from "@/db";
import { loyaltyPrograms, rewards, users } from "@/db/schema";
import { requireBusiness } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Belohnungen" };

export default async function BusinessRewardsPage() {
  const ctx = await requireBusiness("rewards.redeem");
  const db = getDb();
  const [list, [counts]] = await Promise.all([
    db
      .select({ r: rewards, program: loyaltyPrograms.name, customer: users.name })
      .from(rewards)
      .innerJoin(loyaltyPrograms, eq(loyaltyPrograms.id, rewards.programId))
      .leftJoin(users, eq(users.id, rewards.customerId))
      .where(eq(rewards.businessId, ctx.businessId))
      .orderBy(desc(sql`coalesce(${rewards.redeemedAt}, ${rewards.createdAt})`))
      .limit(50),
    db.execute<{ open: number; redeemed: number; expired: number }>(sql`
      select count(*) filter (where status = 'available')::int as open,
             count(*) filter (where status = 'redeemed')::int as redeemed,
             count(*) filter (where status = 'expired')::int as expired
      from rewards where business_id = ${ctx.businessId}`),
  ]);
  const STATUS = { available: ["Offen", "brand"], redeemed: ["Eingelöst", "success"], expired: ["Abgelaufen", "neutral"] } as const;

  return (
    <div className="space-y-6">
      <PageHeader title="Belohnungen" description="Freigeschaltete Belohnungen deiner Kund:innen – und Einlösung an der Kasse." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Offen" value={counts.open} />
        <StatCard label="Eingelöst (gesamt)" value={counts.redeemed} />
        <StatCard label="Abgelaufen" value={counts.expired} />
      </div>
      <Card>
        <CardHeader title="Code einlösen" description="Kund:in zeigt den Code in der STAMPLY-App." />
        <CardBody>
          <ActionForm action={redeemAction} submitLabel="Einlösen" resetOnSuccess className="max-w-md">
            <Input name="code" required placeholder="z. B. 7KQ3M9PX" autoComplete="off" className="h-14 font-mono text-xl tracking-[0.25em] uppercase" aria-label="Belohnungscode" />
          </ActionForm>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Verlauf" />
        <CardBody className="p-0 sm:p-0">
          {list.length === 0 ? (
            <div className="p-6"><EmptyState icon="🎁" title="Noch keine Belohnungen" description="Sobald Kund:innen eine Karte vollständig gesammelt haben, erscheinen die Belohnungen hier." /></div>
          ) : (
            <div className="divide-y divide-line">
              {list.map(({ r, program, customer }) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="truncate text-sm text-muted">{customer ? customer.split(" ")[0] : "Gelöschtes Konto"} · {program}</p>
                  </div>
                  <span className="text-sm text-muted">{formatDateTime(r.redeemedAt ?? r.createdAt)}</span>
                  <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
