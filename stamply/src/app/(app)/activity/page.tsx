import { CheckCircle2, Gift, Receipt, Stamp } from "lucide-react";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { myActivity } from "@/domain/customers";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Aktivitäten" };

const SOURCE: Record<string, string> = { receipt: "per Kassenbon", code: "per Code", manual: "vom Team vergeben" };
const RECEIPT: Record<string, { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  processing: { label: "Wird geprüft", tone: "warning" },
  needs_review: { label: "In Prüfung", tone: "warning" },
  approved: { label: "Bestätigt", tone: "success" },
  rejected: { label: "Abgelehnt", tone: "danger" },
};

export default async function ActivityPage() {
  const user = await requireUser("customer");
  const items = await myActivity(getDb(), user.id, 100);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Aktivitäten" description="Alle Stempel, Bons und Belohnungen im Überblick." back="/profile" />
      {items.length === 0 ? (
        <EmptyState icon={<Stamp />} title="Noch keine Aktivitäten" />
      ) : (
        <ol className="relative space-y-3 border-l-2 border-line pl-6">
          {items.map((it, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full bg-surface text-brand shadow-card">
                {it.kind === "stamp" ? <Stamp size={14} /> : it.kind === "receipt" ? <Receipt size={14} /> : it.kind === "reward" ? <Gift size={14} /> : <CheckCircle2 size={14} />}
              </span>
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {it.kind === "stamp" && `Stempel ${SOURCE[it.detail ?? ""] ?? ""}`}
                    {it.kind === "receipt" && "Kassenbon eingereicht"}
                    {it.kind === "reward" && `Belohnung freigeschaltet: ${it.detail}`}
                    {it.kind === "reward_redeemed" && `Belohnung eingelöst: ${it.detail}`}
                  </p>
                  {it.kind === "receipt" && it.status && <Badge tone={RECEIPT[it.status]?.tone}>{RECEIPT[it.status]?.label}</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  <Link href={`/b/${it.slug}`} className="hover:underline">{it.business}</Link> · {formatDateTime(it.at)}
                </p>
                {it.kind === "receipt" && it.status === "rejected" && it.detail && <p className="mt-1 text-sm text-danger">{it.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
