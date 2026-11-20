import { Plus } from "lucide-react";
import Link from "next/link";
import { Badge, ButtonLink, EmptyState, PageHeader, StampDots } from "@/components/ui";
import { getDb } from "@/db";
import { describeReward, listPrograms } from "@/domain/programs";
import { requireBusiness } from "@/lib/auth/session";
import { entitlements } from "@/lib/plans";

export const metadata = { title: "Treueprogramme" };

const STATUS = { active: ["Aktiv", "success"], draft: ["Entwurf", "neutral"], paused: ["Pausiert", "warning"], archived: ["Archiviert", "neutral"] } as const;

export default async function ProgramsPage() {
  const ctx = await requireBusiness("programs.manage");
  const programs = await listPrograms(getDb(), ctx.businessId);
  const e = entitlements(ctx.business.plan);
  return (
    <div>
      <PageHeader
        title="Treueprogramme"
        description={`Dein Tarif erlaubt ${e.maxActivePrograms} aktive${e.maxActivePrograms === 1 ? "s Programm" : " Programme"} gleichzeitig.`}
        action={<ButtonLink href="/business/programs/new"><Plus size={18} /> Neues Programm</ButtonLink>}
      />
      {programs.length === 0 ? (
        <EmptyState icon="🎟️" title="Noch kein Treueprogramm" description="Lege fest, wie viele Stempel es für welche Belohnung gibt – z. B. 10 Kaffees → 1 gratis." action={<ButtonLink href="/business/programs/new">Erstes Programm erstellen</ButtonLink>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((p) => (
            <Link key={p.id} href={`/business/programs/${p.id}`} className="pressable overflow-hidden rounded-3xl border border-line bg-surface shadow-card hover:shadow-pop">
              <div className="h-1.5" style={{ background: p.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{p.name}</p>
                    <p className="truncate text-sm text-muted">{p.stampsRequired} Stempel → {describeReward(p)}</p>
                  </div>
                  <Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge>
                </div>
                <div className="mt-4"><StampDots progress={0} required={p.stampsRequired} color={p.color} size="sm" /></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[["Teilnehmer", p.participants], ["Stempel", p.stamps], ["Eingelöst", p.rewardsRedeemed]].map(([l, v]) => (
                    <div key={l as string} className="rounded-2xl bg-surface-2 py-2"><p className="text-lg font-bold tabular-nums">{v}</p><p className="text-xs text-muted">{l}</p></div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
