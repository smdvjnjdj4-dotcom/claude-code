import { EmptyState } from "@/components/ui";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return <EmptyState icon="📡" title="Du bist offline" description="Sobald du wieder verbunden bist, kannst du weiter Stempel sammeln." />;
}
