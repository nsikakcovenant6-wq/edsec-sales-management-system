import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-label="Loading workspace" aria-busy="true" className="space-y-8">
      <div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="h-4 w-full max-w-xl" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="rounded-2xl border border-[var(--border)] bg-white p-5"><Skeleton className="size-10 rounded-xl" /><Skeleton className="mt-5 h-4 w-32" /><Skeleton className="mt-3 h-3 w-full" /><Skeleton className="mt-2 h-3 w-2/3" /></div>)}</div>
    </div>
  );
}
