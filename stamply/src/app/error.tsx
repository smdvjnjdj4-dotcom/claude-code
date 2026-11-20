"use client";

import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <EmptyState icon="⚠️" title="Da ist etwas schiefgelaufen" description="Bitte versuche es erneut. Wenn das Problem bleibt, melde dich bei uns." action={<Button onClick={reset}>Erneut versuchen</Button>} />
    </div>
  );
}
