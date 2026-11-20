import { CollectFlow } from "@/components/collect";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Code einlösen" };

/** Deep link from the counter QR code: /collect?code=XXXXXXXX. Claiming still requires a tap (no GET side effects). */
export default async function CollectByCodePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requireUser("customer");
  const { code } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Stempel einlösen" description="Bestätige den Code von der Kasse." back="/" />
      <CollectFlow programId="" color="#6c47ff" initialCode={code?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)} backHref="/cards" />
    </div>
  );
}
