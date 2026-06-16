"use client";

import { Button } from "@/components/ui/button";

type Props = {
  error: string;
  onRetry: () => void;
  pending?: boolean;
};

export function FeedInfiniteScrollError({
  error,
  onRetry,
  pending = false,
}: Props) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2 pb-6">
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={onRetry}
        className="rounded-full border-border bg-background text-foreground hover:bg-secondary"
      >
        {pending ? "Chargement…" : "Réessayer"}
      </Button>
    </div>
  );
}
