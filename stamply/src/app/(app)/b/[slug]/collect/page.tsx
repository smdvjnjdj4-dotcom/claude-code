import { notFound } from "next/navigation";
import { CollectFlow } from "@/components/collect";
import { Avatar, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { getBusinessPublic } from "@/domain/discovery";
import { describeReward } from "@/domain/programs";
import { requireUser } from "@/lib/auth/session";
import { fileUrl } from "@/lib/storage";

export const metadata = { title: "Stempel sammeln" };

export default async function CollectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ program?: string }> }) {
  const user = await requireUser("customer");
  const { slug } = await params;
  const { program } = await searchParams;
  const data = await getBusinessPublic(getDb(), slug, user.id);
  if (!data || !data.programs.length) notFound();
  const p = data.programs.find((x) => x.id === program) ?? data.programs[0];
  const progress = data.relation.progress[p.id] ?? 0;

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Stempel sammeln" back={`/b/${slug}`} />
      <div className="mb-5 flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-card">
        <Avatar name={data.business.name} src={fileUrl(data.business.logoPath)} size={44} color={p.color} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{data.business.name}</p>
          <p className="truncate text-sm text-muted">{progress}/{p.stampsRequired} · {describeReward(p)}</p>
        </div>
      </div>
      <CollectFlow programId={p.id} color={p.color} backHref={`/b/${slug}`} />
    </div>
  );
}
