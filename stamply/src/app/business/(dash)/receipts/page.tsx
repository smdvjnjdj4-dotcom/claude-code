import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { reviewReceiptAction } from "@/app/actions/business";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, EmptyState, Input, Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { listReceiptQueue } from "@/domain/receipts/service";
import { RISK_LABELS, type RiskFlag } from "@/domain/receipts/analyze";
import { requireBusiness } from "@/lib/auth/session";
import { fileUrl } from "@/lib/storage";
import { formatDate, formatDateTime, formatEuro } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bon-Prüfung" };

const TABS = [
  ["needs_review", "Zu prüfen"],
  ["approved", "Bestätigt"],
  ["rejected", "Abgelehnt"],
] as const;

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireBusiness("receipts.review");
  const { tab } = await searchParams;
  const status = (TABS.find((t) => t[0] === tab)?.[0] ?? "needs_review") as (typeof TABS)[number][0];
  const rows = await listReceiptQueue(getDb(), ctx.userId, ctx.businessId, status);

  return (
    <div>
      <PageHeader title="Bon-Prüfung" description="Eindeutige Bons werden automatisch bestätigt. Hier landen alle, bei denen die Prüfung unsicher war." />
      <Notice tone="neutral">
        Die Texterkennung ist eine Hilfe, kein Fälschungsschutz. Prüfe bei Zweifeln Geschäftsname, Datum, Betrag – und ob der Bon zu einem echten Einkauf passt.
        {ctx.business.receiptReviewMode === "always_manual" ? " Aktuell: Alle Bons werden manuell geprüft." : " "}
        <Link href="/business/settings" className="font-semibold text-brand hover:underline">Prüfmodus ändern</Link>
      </Notice>

      <div className="mt-5 inline-flex rounded-full bg-surface-2 p-1">
        {TABS.map(([id, label]) => (
          <Link key={id} href={`/business/receipts?tab=${id}`} className={cn("rounded-full px-4 py-2 text-sm font-medium", status === id ? "bg-surface shadow-card" : "text-muted")}>{label}</Link>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {rows.length === 0 ? (
          <EmptyState icon="🧾" title={status === "needs_review" ? "Alles geprüft!" : "Keine Einträge"} description={status === "needs_review" ? "Neue Bons zur Prüfung erscheinen hier und im Menü." : undefined} />
        ) : (
          rows.map(({ receipt: r, programName, minPurchaseCents, customerName }) => (
            <Card key={r.id} className="overflow-hidden">
              <div className="grid md:grid-cols-[260px_1fr]">
                <div className="bg-surface-2">
                  {r.imagePath ? (
                    <a href={fileUrl(r.imagePath)!} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl(r.imagePath)!} alt="Kassenbon" className="h-72 w-full object-contain md:h-full md:max-h-96" />
                    </a>
                  ) : (
                    <p className="flex h-40 items-center justify-center p-4 text-center text-sm text-muted">Bild nach Aufbewahrungsfrist gelöscht</p>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{customerName ? customerName.split(" ")[0] : "Gelöschtes Konto"}</p>
                    <span className="text-sm text-muted">· {programName} · eingereicht {formatDateTime(r.createdAt)}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <Info label="Geschäft" value={r.detectedMerchant ?? "nicht erkannt"} warn={!r.detectedMerchant} />
                    <Info label="Datum" value={r.detectedDate ? formatDate(r.detectedDate) : "nicht erkannt"} warn={!r.detectedDate} />
                    <Info label="Betrag" value={formatEuro(r.detectedAmountCents)} warn={r.detectedAmountCents == null || r.detectedAmountCents < minPurchaseCents} />
                    <Info label="Bon-Nr." value={r.detectedReceiptNo ?? "–"} />
                  </dl>
                  {r.riskFlags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <Badge tone={r.riskScore >= 60 ? "danger" : "warning"}><AlertTriangle size={12} /> Risiko {r.riskScore}/100</Badge>
                      {r.riskFlags.map((f) => <Badge key={f} tone="neutral">{RISK_LABELS[f as RiskFlag] ?? f}</Badge>)}
                    </div>
                  )}
                  {minPurchaseCents > 0 && <p className="mt-2 text-xs text-muted">Mindestumsatz: {formatEuro(minPurchaseCents)}</p>}
                  {r.ocrText && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-muted">Erkannter Text</summary>
                      <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-2xl bg-surface-2 p-3 font-mono text-xs">{r.ocrText}</pre>
                    </details>
                  )}
                  {status === "needs_review" ? (
                    <ActionForm action={reviewReceiptAction} hideSubmit className="mt-5">
                      <input type="hidden" name="receiptId" value={r.id} />
                      <Input name="note" placeholder="Begründung bei Ablehnung (wird der Kundin/dem Kunden angezeigt)" maxLength={200} />
                      <div className="flex flex-wrap gap-2">
                        <SubmitButton name="decision" value="approve">Bestätigen & Stempel vergeben</SubmitButton>
                        <SubmitButton name="decision" value="reject" variant="outline">Ablehnen</SubmitButton>
                      </div>
                    </ActionForm>
                  ) : (
                    <p className="mt-4 text-sm text-muted">{r.decisionNote} · {formatDateTime(r.decidedAt)}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Info({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("truncate font-semibold", warn && "text-warning")}>{value}</dd>
    </div>
  );
}
