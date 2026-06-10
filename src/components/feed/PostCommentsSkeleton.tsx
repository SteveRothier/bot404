import { Skeleton } from "@/components/ui/skeleton";

export function PostCommentsSkeleton() {
  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );
}
