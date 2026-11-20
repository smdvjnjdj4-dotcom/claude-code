import { inviteAction } from "@/app/actions/business";
import { InviteResult, MemberControls, RevokeInvite } from "@/components/team-controls";
import { Field } from "@/components/forms";
import { Avatar, Badge, Card, CardBody, CardHeader, Input, PageHeader, Select } from "@/components/ui";
import { getDb } from "@/db";
import { listTeam } from "@/domain/businesses";
import { requireBusiness } from "@/lib/auth/session";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { entitlements } from "@/lib/plans";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Mitarbeiter" };

export default async function TeamPage() {
  const ctx = await requireBusiness();
  const { members, invites } = await listTeam(getDb(), ctx.userId, ctx.businessId);
  const manage = can(ctx.role, "team.manage");
  const max = entitlements(ctx.business.plan).maxMembers;
  return (
    <div className="space-y-6">
      <PageHeader title="Mitarbeiter" description={`${members.length} von ${max} Plätzen in deinem Tarif belegt.`} />
      <Card>
        <CardHeader title="Rollen" />
        <CardBody className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-2 p-4"><p className="font-semibold">Inhaber:in</p><p className="mt-1 text-muted">Alles, inkl. Abonnement und Team.</p></div>
          <div className="rounded-2xl bg-surface-2 p-4"><p className="font-semibold">Manager:in</p><p className="mt-1 text-muted">Profil, Programme, Kampagnen, Statistiken – ohne Abo & Team.</p></div>
          <div className="rounded-2xl bg-surface-2 p-4"><p className="font-semibold">Mitarbeiter:in</p><p className="mt-1 text-muted">Kasse: Stempel vergeben, Bons prüfen, Belohnungen einlösen.</p></div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Team" />
        <CardBody className="divide-y divide-line py-0 sm:py-0">
          {members.map((m) => (
            <div key={m.userId} className="flex flex-wrap items-center gap-3 py-4">
              <Avatar name={m.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.name} {m.userId === ctx.userId && <span className="text-sm text-muted">(du)</span>}</p>
                <p className="truncate text-sm text-muted">{m.email} · seit {formatDate(m.since)}</p>
              </div>
              {manage && m.role !== "owner" ? <MemberControls userId={m.userId} role={m.role} /> : <Badge tone="brand">{ROLE_LABEL[m.role]}</Badge>}
            </div>
          ))}
          {invites.map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-4">
              <Avatar name={i.email} size={40} />
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{i.email}</p><p className="text-sm text-muted">Eingeladen als {ROLE_LABEL[i.role]} · gültig bis {formatDate(i.expiresAt)}</p></div>
              {manage && <RevokeInvite id={i.id} />}
            </div>
          ))}
        </CardBody>
      </Card>
      {manage && (
        <Card>
          <CardHeader title="Teammitglied einladen" description="Die Person registriert sich mit dieser E-Mail als Unternehmenskonto und öffnet den Einladungslink." />
          <CardBody>
            <InviteResult action={inviteAction}>
              <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <Field label="E-Mail" name="email"><Input id="email" name="email" type="email" required /></Field>
                <Field label="Rolle" name="role"><Select id="role" name="role" defaultValue="staff"><option value="staff">Mitarbeiter:in</option><option value="manager">Manager:in</option></Select></Field>
              </div>
            </InviteResult>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
