"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { runManualTickAction } from "@/app/actions/npc-ops";
import {
  SidebarPanelSection,
} from "@/components/widgets/SidebarPanel";
import type { NpcOpsSnapshot } from "@/lib/queries/shell/narrative-ops";
import { cn } from "@/lib/utils";
import { useOllamaStore } from "@/stores/ollama-store";

type Props = {
  snapshot: NpcOpsSnapshot;
  compact?: boolean;
};

function LoadingDots({ compact }: { compact: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "rounded-full bg-current animate-bounce",
            compact ? "size-1" : "size-1.5"
          )}
          style={{
            animationDelay: `${index * 140}ms`,
            animationDuration: "0.9s",
          }}
        />
      ))}
    </span>
  );
}

function OpsRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-meta text-muted-foreground">{label}</span>
      <span className="text-meta font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export function NpcOpsPanel({ snapshot, compact = false }: Props) {
  const router = useRouter();
  const ollamaOnline = useOllamaStore((s) => s.online);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const last = snapshot.lastTick;
  const lastDetail = last?.detail as Record<string, unknown> | undefined;
  const lastAuthor =
    (lastDetail?.author as string | undefined) ??
    (lastDetail?.batch as Array<{ author?: string }> | undefined)?.[0]?.author;

  const showBacklogWarning =
    !ollamaOnline && snapshot.narrative.pendingSignals > 5;

  function handleTick() {
    setError(null);
    startTransition(async () => {
      const result = await runManualTickAction();
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <SidebarPanelSection className={compact ? "mt-2" : "mt-3"}>
      <p className="text-meta font-semibold text-foreground">Ops NPC</p>
      {showBacklogWarning && (
        <p className="mt-1 text-meta text-amber-600 dark:text-amber-400">
          Ollama inactif — {snapshot.narrative.pendingSignals} signaux en attente
        </p>
      )}
      <div className="mt-1 space-y-0">
        <OpsRow
          label="Signaux"
          value={snapshot.narrative.pendingSignals}
        />
        {snapshot.oldestPendingMinutes != null && (
          <OpsRow
            label="Plus ancien"
            value={`${snapshot.oldestPendingMinutes} min`}
          />
        )}
        {snapshot.pendingEtaMinutes != null && (
          <OpsRow label="ETA tick" value={`~${snapshot.pendingEtaMinutes} min`} />
        )}
        <OpsRow
          label="Échecs 24h"
          value={snapshot.failedSignals24h}
        />
        <OpsRow
          label="Expirés 24h"
          value={snapshot.expiredSignals24h}
        />
        <OpsRow
          label="Arc émergent"
          value={
            snapshot.emergentArcStatus === "active"
              ? "actif"
              : snapshot.emergentArcStatus ?? "—"
          }
        />
        {last && (
          <>
            <OpsRow label="Dernier tick" value={last.mode} />
            {last.metrics?.duration_ms != null && (
              <OpsRow
                label="Durée"
                value={`${(last.metrics.duration_ms / 1000).toFixed(1)} s`}
              />
            )}
            {lastAuthor && <OpsRow label="Auteur" value={`@${lastAuthor}`} />}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={handleTick}
        disabled={isPending || !snapshot.generation.enabled}
        aria-busy={isPending}
        className={cn(
          "mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-meta font-medium transition-colors",
          isPending && "relative overflow-hidden",
          isPending || !snapshot.generation.enabled
            ? "cursor-not-allowed bg-secondary/50 text-muted-foreground"
            : "bg-secondary text-foreground hover:bg-secondary/80"
        )}
      >
        {isPending && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full skeleton-shimmer opacity-40"
          />
        )}
        <Zap
          className={cn(
            "size-3.5 relative z-[1]",
            isPending && "animate-pulse"
          )}
          strokeWidth={1.75}
        />
        <span className="relative z-[1]">
          {isPending ? (
            <LoadingDots compact={compact} />
          ) : (
            "Lancer un tick"
          )}
        </span>
      </button>
      {error && (
        <p className="mt-1 text-meta text-destructive">{error}</p>
      )}
    </SidebarPanelSection>
  );
}
