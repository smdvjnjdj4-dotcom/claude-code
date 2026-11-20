import { Gift } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { myRewards } from "@/domain/customers";
import { requireUser } from "@/lib/auth/session";
import { fileUrl } from "@/lib/storage";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Belohnungen" };

export default async function RewardsPage() {
  const user = await requireUser("customer");
  const rows = await myRewards(getDb(), user.id);
  const open = rows.filter((r) => r.reward.status === "available" && (!r.reward.expiresAt || r.reward.expiresAt > new Date()));
  const past = rows.filter((r) => !open.includes(r));
  return (
    <div>
      <PageHeader title="Belohnungen" description="Zeige den Code an der Kasse, um deine Belohnung einzulösen." />
      {rows.length === 0 && <EmptyState icon={<Gift />} title="Noch keine Belohnungen" description="Volle Stempelkarten werden hier automatisch zu Belohnungen." action={<ButtonLink href="/cards">Zu meinen Stempeln</ButtonLink>} />}
      {open.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {open.map(({ reward, businessName }) => (
            <Link key={reward.id} href={`/rewards/${reward.id}`} className="pressable rounded-[1.75rem] bg-gradient-to-br from-[#8b6dff] to-[#5532f0] p-6 text-white shadow-pop">
              <Gift size={24} />
              <p className="mt-8 text-xl font-bold">{reward.title}</p>
              <p className="mt-1 text-white/75">{businessName}</p>
              <p className="mt-4 text-xs text-white/70">{reward.expiresAt ? `Einlösbar bis ${formatDate(reward.expiresAt)}` : "Unbegrenzt einlösbar"}</p>
            </Link>
          ))}
        </div>
      )}
      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Verlauf</h2>
          <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
            {past.map(({ reward, businessName, logoPath }) => (
              <div key={reward.id} className="flex items-center gap-3 p-4">
                <Avatar name={businessName} src={fileUrl(logoPath)} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{reward.title}</p>
                  <p className="text-sm text-muted">{businessName} · {formatDate(reward.redeemedAt ?? reward.createdAt)}</p>
                </div>
                <Badge tone={reward.status === "redeemed" ? "success" : "neutral"}>{reward.status === "redeemed" ? "Eingelöst" : "Abgelaufen"}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
