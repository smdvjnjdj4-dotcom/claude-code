import { Skeleton } from '@/components/ui/primitives';

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 md:col-span-2" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}
