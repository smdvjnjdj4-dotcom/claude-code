import { notFound } from "next/navigation";
import { ProgramEditor } from "@/components/program-editor";
import { ProgramStatusButtons } from "@/components/status-buttons";
import { Badge, Notice, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { listLocations } from "@/domain/businesses";
import { getProgram } from "@/domain/programs";
import { requireBusiness } from "@/lib/auth/session";
import { isDomainError } from "@/lib/errors";

export const metadata = { title: "Treueprogramm bearbeiten" };

export default async function ProgramPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const ctx = await requireBusiness("programs.manage");
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const program = await getProgram(getDb(), ctx.userId, ctx.businessId, id).catch((e) => {
    if (isDomainError(e)) notFound();
    throw e;
  });
  const locations = await listLocations(getDb(), ctx.businessId);
  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3">{program.name} <Badge tone={program.status === "active" ? "success" : "neutral"}>{{ active: "Aktiv", draft: "Entwurf", paused: "Pausiert", archived: "Archiviert" }[program.status]}</Badge></span>}
        back="/business/programs"
        action={<ProgramStatusButtons id={program.id} status={program.status} />}
      />
      {saved && <div className="mb-6"><Notice tone="success">Gespeichert.</Notice></div>}
      <ProgramEditor program={program} locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
    </div>
  );
}
