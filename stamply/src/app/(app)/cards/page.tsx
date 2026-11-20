import Link from "next/link";
import { Avatar, Badge, ButtonLink, EmptyState, PageHeader, StampDots } from "@/components/ui";
import { getDb } from "@/db";
import { myCards } from "@/domain/customers";
import { requireUser } from "@/lib/auth/session";
import { fileUrl } from "@/lib/storage";
import { formatDate, relativeTime } from "@/lib/time";

export const metadata = { title: "Meine Stempel" };

export default async function CardsPage() {
  const user = await requireUser("customer");
  const cards = await myCards(getDb(), user.id);
  return (
    <div>
      <PageHeader title="Meine Stempelkarten" description="Alle Treuekarten an einem Ort." action={<ButtonLink href="/activity" variant="outline" size="sm">Aktivität</ButtonLink>} />
      {cards.length === 0 ? (
        <EmptyState icon="🎟️" title="Noch keine Stempel" description="Entdecke Geschäfte in deiner Nähe und sammle beim nächsten Einkauf deinen ersten Stempel." action={<ButtonLink href="/explore">Geschäfte entdecken</ButtonLink>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Link key={c.programId} href={`/b/${c.slug}`} className="pressable relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-5 shadow-card hover:shadow-pop animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: c.color }} />
              <div className="flex items-center gap-3">
                <Avatar name={c.businessName} src={fileUrl(c.logoPath)} size={44} color={c.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.businessName}</p>
                  <p className="truncate text-sm text-muted">{c.programName}</p>
                </div>
                {c.rewardsAvailable > 0 && <Badge tone="success">🎁 {c.rewardsAvailable}</Badge>}
              </div>
              <div className="mt-5"><StampDots progress={c.progress} required={c.stampsRequired} color={c.color} /></div>
              <p className="mt-4 text-sm"><span className="font-semibold">{c.progress}/{c.stampsRequired}</span> <span className="text-muted">→ {c.rewardTitle}</span></p>
              <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted">
                {c.lastStamp && <span>Letzter Stempel {relativeTime(c.lastStamp)}</span>}
                {c.nextExpiry && <span>Nächster Stempel verfällt am {formatDate(c.nextExpiry)}</span>}
                {c.programStatus !== "active" && <span className="text-warning">Programm pausiert</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
