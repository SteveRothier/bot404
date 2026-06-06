"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useOllamaStore } from "@/stores/ollama-store";

type Props = {
  compact?: boolean;
};

export function OllamaStatusBadge({ compact = false }: Props) {
  const online = useOllamaStore((s) => s.online);
  const model = useOllamaStore((s) => s.model);

  useEffect(() => {
    void useOllamaStore.getState().refresh();
    useOllamaStore.getState().startPolling();
    return () => useOllamaStore.getState().stopPolling();
  }, []);

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 text-meta">
        <span className="min-w-0 truncate text-muted-foreground">
          Ollama · {model}
        </span>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 font-medium",
            online ? "text-emerald-500" : "text-muted-foreground"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              online ? "bg-emerald-500" : "bg-muted-foreground"
            )}
          />
          {online ? "Actif" : "Inactif"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <span className="text-[15px] text-muted-foreground">Ollama</span>
        <p className="truncate text-[13px] text-muted-foreground">{model}</p>
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 text-[13px] font-medium",
          online ? "text-emerald-500" : "text-muted-foreground"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            online ? "bg-emerald-500" : "bg-muted-foreground"
          )}
        />
        {online ? "Actif" : "Inactif"}
      </span>
    </div>
  );
}
