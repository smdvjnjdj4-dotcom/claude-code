import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <EmptyState icon="🧭" title="Seite nicht gefunden" description="Diese Seite gibt es nicht (mehr)." action={<ButtonLink href="/">Zur Startseite</ButtonLink>} />
    </div>
  );
}
