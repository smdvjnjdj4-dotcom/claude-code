import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Wird geladen">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-14 w-full rounded-full" />
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-[260px] shrink-0 rounded-[1.75rem]" />)}
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-[260px] shrink-0 rounded-[1.75rem]" />)}
      </div>
    </div>
  );
}
