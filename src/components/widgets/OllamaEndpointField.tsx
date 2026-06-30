"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useOllamaStore } from "@/stores/ollama-store";

type Props = {
  defaultEndpointUrl: string;
  defaultModel: string;
  compact?: boolean;
};

function statusTone(active: boolean): { label: string; text: string; dot: string } {
  if (active) {
    return {
      label: "Actif",
      text: "text-accent",
      dot: "bg-accent",
    };
  }
  return {
    label: "Inactif",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
}

export function OllamaEndpointField({
  defaultEndpointUrl,
  defaultModel,
  compact = false,
}: Props) {
  const online = useOllamaStore((s) => s.online);
  const model = useOllamaStore((s) => s.model);

  useEffect(() => {
    useOllamaStore.getState().initEndpoint(defaultEndpointUrl, defaultModel);
    useOllamaStore.getState().startPolling();
    return () => useOllamaStore.getState().stopPolling();
  }, [defaultEndpointUrl, defaultModel]);

  const { label, text: tone, dot } = statusTone(online);

  return (
    <div className={cn("space-y-1", compact ? "text-meta" : "text-sm")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">IA locale</span>
        <span className={cn("flex shrink-0 items-center gap-1 font-medium", tone)}>
          <span
            aria-hidden
            className={cn(
              "rounded-full",
              compact ? "size-1.5" : "size-2",
              dot
            )}
          />
          {label}
        </span>
      </div>
      <p className="truncate text-muted-foreground">{model || defaultModel || "—"}</p>
    </div>
  );
}
