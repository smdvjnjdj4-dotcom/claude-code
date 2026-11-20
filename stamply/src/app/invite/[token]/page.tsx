import Link from "next/link";
import { AcceptInvite } from "@/components/accept-invite";
import { ButtonLink, Card, EmptyState, Logo } from "@/components/ui";
import { getDb } from "@/db";
import { getInvite } from "@/domain/businesses";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/permissions";

export const metadata = { title: "Einladung" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv, user] = await Promise.all([getInvite(getDb(), token), getCurrentUser()]);
  const next = encodeURIComponent(`/invite/${token}`);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link href="/"><Logo /></Link>
      <div className="mt-10">
        {!inv ? (
          <EmptyState icon="✉️" title="Einladung ungültig" description="Der Link ist abgelaufen oder wurde bereits verwendet. Bitte frag nach einem neuen Link." />
        ) : (
          <Card className="p-6">
            <h1 className="text-2xl font-bold">Einladung zu {inv.businessName}</h1>
            <p className="mt-2 text-muted">Du wurdest als <b>{ROLE_LABEL[inv.invite.role]}</b> eingeladen ({inv.invite.email}).</p>
            <div className="mt-6">
              {!user ? (
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href={`/register/business?next=${next}`}>Unternehmenskonto erstellen</ButtonLink>
                  <ButtonLink href={`/login?next=${next}`} variant="outline">Anmelden</ButtonLink>
                </div>
              ) : user.accountType !== "business" ? (
                <p className="text-sm text-danger">Du bist mit einem Kundenkonto angemeldet. Bitte melde dich ab und mit einem Unternehmenskonto ({inv.invite.email}) an.</p>
              ) : (
                <AcceptInvite token={token} />
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
