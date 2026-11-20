import { Bell } from "lucide-react";
import Link from "next/link";
import { markAllReadAction } from "@/app/actions/customer";
import { PushToggle } from "@/components/client";
import { Avatar, Badge, Button, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { myNotifications } from "@/domain/customers";
import { requireUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { fileUrl } from "@/lib/storage";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Benachrichtigungen" };

export default async function NotificationsPage() {
  const user = await requireUser("customer");
  const rows = await myNotifications(getDb(), user.id);
  const unread = rows.some((r) => !r.n.readAt);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Benachrichtigungen"
        action={unread ? <form action={markAllReadAction}><Button variant="outline" size="sm">Alle gelesen</Button></form> : undefined}
      />
      <Card className="mb-6"><CardBody><PushToggle vapidKey={env.vapid.publicKey} /></CardBody></Card>
      {rows.length === 0 ? (
        <EmptyState icon={<Bell />} title="Alles ruhig hier" description="Stempel-Bestätigungen und Updates der Geschäfte, die du abonniert hast, erscheinen hier." />
      ) : (
        <div className="space-y-2">
          {rows.map(({ n, businessName, logoPath }) => {
            const inner = (
              <div className={cn("flex gap-3 rounded-3xl border border-line p-4 transition", n.readAt ? "bg-surface" : "bg-brand-soft/60")}>
                {businessName ? <Avatar name={businessName} src={fileUrl(logoPath)} size={40} /> : <Avatar name="S" size={40} color="#6c47ff" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    {n.kind === "marketing" && <Badge>Werbung</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-fg/80">{n.body}</p>
                  {n.imagePath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(n.imagePath)!} alt="" className="mt-3 max-h-48 rounded-2xl object-cover" />
                  )}
                  <p className="mt-1.5 text-xs text-muted">{businessName ? `${businessName} · ` : ""}{relativeTime(n.createdAt)}</p>
                </div>
              </div>
            );
            return n.link ? <Link key={n.id} href={n.link} className="block">{inner}</Link> : <div key={n.id}>{inner}</div>;
          })}
        </div>
      )}
      <p className="mt-6 text-center text-xs text-muted">Werbliche Nachrichten erhältst du nur von Geschäften, deren Updates du abonniert hast. Abbestellen: im Profil unter „Datenschutz & Einwilligungen“.</p>
    </div>
  );
}
