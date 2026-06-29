"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isMixedContentOllamaUrl } from "@/lib/ollama-client";
import { normalizeOllamaEndpointUrl } from "@/lib/ollama-config";
import { pingOllamaUrl } from "@/lib/ollama";
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
  const endpointUrl = useOllamaStore((s) => s.endpointUrl);

  const [draft, setDraft] = useState(defaultEndpointUrl);
  const [error, setError] = useState<string | null>(null);
  const [linkReachable, setLinkReachable] = useState<boolean | null>(null);

  useEffect(() => {
    useOllamaStore.getState().initEndpoint(defaultEndpointUrl, defaultModel);
    useOllamaStore.getState().startPolling();
    return () => useOllamaStore.getState().stopPolling();
  }, [defaultEndpointUrl, defaultModel]);

  useEffect(() => {
    if (endpointUrl) setDraft(endpointUrl);
  }, [endpointUrl]);

  useEffect(() => {
    const normalized = normalizeOllamaEndpointUrl(draft.trim());
    if (!normalized) {
      setLinkReachable(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void pingOllamaUrl(normalized).then((ok) => {
        if (!cancelled) setLinkReachable(ok);
      });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draft]);

  const commit = useCallback(() => {
    if (draft.trim() === endpointUrl) {
      setError(null);
      return;
    }

    const ok = useOllamaStore.getState().setEndpointUrl(draft);
    if (!ok) {
      setError("URL invalide — utilisez http:// ou https://");
      return;
    }
    setError(null);
  }, [draft, endpointUrl]);

  const active = linkReachable ?? online;
  const { label, text: tone, dot } = statusTone(active);
  const showReset = endpointUrl !== defaultEndpointUrl;
  const mixedContent =
    typeof window !== "undefined" && draft
      ? isMixedContentOllamaUrl(draft)
      : false;

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

      <input
        type="url"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="http://127.0.0.1:11434"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full rounded-md border border-input bg-transparent px-2 py-1 font-mono text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          compact ? "h-7 text-meta" : "h-8 text-sm",
          error && "border-destructive"
        )}
      />

      {error && (
        <p className="text-meta text-destructive">{error}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-muted-foreground">{model || defaultModel || "—"}</p>
        {showReset && (
          <button
            type="button"
            onClick={() => useOllamaStore.getState().resetEndpointUrl()}
            className="shrink-0 text-meta text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {mixedContent && (
        <p className="text-meta text-amber-600 dark:text-amber-400">
          URL HTTP distante depuis une page HTTPS — privilégiez un tunnel HTTPS.
        </p>
      )}
    </div>
  );
}
