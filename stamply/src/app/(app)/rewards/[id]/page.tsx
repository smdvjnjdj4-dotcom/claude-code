import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Avatar, Badge, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { getMyReward } from "@/domain/customers";
import { requireUser } from "@/lib/auth/session";
import { fileUrl } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/time";

export const metadata = { title: "Belohnung einlösen" };

export default async function RewardDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("customer");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const r = await getMyReward(getDb(), user.id, id);
  if (!r) notFound();
  const { reward } = r;
  const usable = reward.status === "available" && (!reward.expiresAt || reward.expiresAt > new Date());
  const qr = usable ? await QRCode.toDataURL(reward.code, { margin: 1, width: 420, color: { dark: "#0b0b10", light: "#ffffff" } }) : null;

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Belohnung" back="/rewards" />
      <div className="overflow-hidden rounded-[2rem] bg-surface shadow-pop animate-fade-up">
        <div className="bg-gradient-to-br from-[#8b6dff] to-[#5532f0] p-6 text-white">
          <div className="flex items-center gap-3">
            <Avatar name={r.businessName} src={fileUrl(r.logoPath)} size={40} className="ring-2 ring-white/40" />
            <p className="font-semibold">{r.businessName}</p>
          </div>
          <p className="mt-6 text-2xl font-bold">{reward.title}</p>
        </div>
        <div className="flex flex-col items-center p-6">
          {usable && qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR-Code ${reward.code}`} className="h-56 w-56 rounded-2xl bg-white p-2" />
              <p className="mt-4 font-mono text-3xl font-bold tracking-[0.3em]">{reward.code}</p>
              <p className="mt-3 text-center text-sm text-muted">Zeige diesen Code an der Kasse. Das Team löst ihn für dich ein – nur einmal gültig.</p>
              {reward.expiresAt && <Badge tone="warning" className="mt-4">Gültig bis {formatDate(reward.expiresAt)}</Badge>}
            </>
          ) : (
            <div className="py-6 text-center">
              <Badge tone={reward.status === "redeemed" ? "success" : "neutral"}>{reward.status === "redeemed" ? "Eingelöst" : "Abgelaufen"}</Badge>
              {reward.redeemedAt && <p className="mt-3 text-sm text-muted">Eingelöst am {formatDateTime(reward.redeemedAt)}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
