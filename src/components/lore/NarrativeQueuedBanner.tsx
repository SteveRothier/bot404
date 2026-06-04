"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  message: string;
  onDismiss: () => void;
  autoDismissMs?: number;
};

export function NarrativeQueuedBanner({
  message,
  onDismiss,
  autoDismissMs = 8000,
}: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [onDismiss, autoDismissMs]);

  return (
    <div
      role="status"
      className="mt-2 flex items-start gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-700 dark:text-violet-300"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-violet-600 hover:text-violet-800 dark:text-violet-400"
        aria-label="Fermer"
      >
        <X className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
