import { ProgramEditor } from "@/components/program-editor";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { listLocations } from "@/domain/businesses";
import { requireBusiness } from "@/lib/auth/session";

export const metadata = { title: "Neues Treueprogramm" };

export default async function NewProgramPage() {
  const ctx = await requireBusiness("programs.manage");
  const locations = await listLocations(getDb(), ctx.businessId);
  return (
    <div>
      <PageHeader title="Neues Treueprogramm" description="Gestalte deine digitale Stempelkarte – ganz nach deinen Regeln." back="/business/programs" />
      <ProgramEditor locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
    </div>
  );
}
