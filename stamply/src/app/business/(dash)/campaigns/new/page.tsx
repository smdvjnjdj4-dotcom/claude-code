import { CampaignBuilder } from "@/components/campaign-builder";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { listPrograms } from "@/domain/programs";
import { SEGMENTS, segmentCounts } from "@/domain/push/audiences";
import { requireBusiness } from "@/lib/auth/session";
import { entitlements } from "@/lib/plans";
import { redirect } from "next/navigation";

export const metadata = { title: "Neue Kampagne" };

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ segment?: string }> }) {
  const ctx = await requireBusiness("campaigns.manage");
  const e = entitlements(ctx.business.plan);
  if (!e.manualPush) redirect("/business/campaigns");
  const { segment } = await searchParams;
  const [counts, programs] = await Promise.all([segmentCounts(getDb(), ctx.businessId), listPrograms(getDb(), ctx.businessId)]);
  return (
    <div>
      <PageHeader title="Neue Kampagne" back="/business/campaigns" />
      <CampaignBuilder
        segments={SEGMENTS.map((s) => ({ ...s, reachable: counts[s.id].reachable }))}
        programs={programs.filter((p) => p.status === "active").map((p) => ({ id: p.id, name: p.name }))}
        ent={{ recurring: e.recurringCampaigns, basic: e.basicAutomations, advanced: e.advancedAutomations }}
        businessName={ctx.business.name}
        slug={ctx.business.slug}
        initialSegment={segment}
      />
    </div>
  );
}
