import Link from "next/link";
import { Radio } from "lucide-react";
import {
  formatPendingInteractions,
  formatScriptedProgressStep,
  NARRATIVE_COPY,
} from "@/lib/narrative/copy";
import type { NarrativeUiState } from "@/lib/narrative/queries";

type Props = NarrativeUiState & {
  variant: "strip" | "inline";
  /** Affiche le bloc « Comment participer ? » (feed strip, mode réactif). */
  showHowTo?: boolean;
};

export function NarrativeStatusCard({
  scriptedActive,
  emergentActive,
  actOneTitle,
  scriptedProgress,
  pendingSignals,
  failedBeatsCount,
  variant,
  showHowTo = false,
}: Props) {
  if (!scriptedActive && !emergentActive) return null;

  const isStrip = variant === "strip";
  const content = scriptedActive && actOneTitle ? (
    <ScriptedContent
      title={actOneTitle}
      progress={scriptedProgress}
      failedBeatsCount={failedBeatsCount}
      isStrip={isStrip}
    />
  ) : emergentActive ? (
    <EmergentContent
      pendingSignals={pendingSignals}
      showHowTo={showHowTo && isStrip}
      isStrip={isStrip}
    />
  ) : null;

  if (!content) return null;

  if (isStrip) {
    return (
      <div className="border-b border-border bg-violet-500/5 px-4 py-2.5">
        <div className="flex items-start gap-2">
          <Radio
            className="mt-0.5 size-4 shrink-0 text-violet-500"
            strokeWidth={1.75}
            aria-hidden
          />
          <div className="min-w-0 flex-1">{content}</div>
        </div>
      </div>
    );
  }

  return <div className="space-y-2 text-[15px]">{content}</div>;
}

function ScriptedContent({
  title,
  progress,
  failedBeatsCount,
  isStrip,
}: {
  title: string;
  progress: { completed: number; total: number } | null;
  failedBeatsCount: number;
  isStrip: boolean;
}) {
  const { scripted } = NARRATIVE_COPY;
  return (
    <>
      {isStrip && (
        <p className="text-meta font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
          {scripted.kicker}
        </p>
      )}
      <p
        className={
          isStrip
            ? "text-[15px] font-bold text-foreground"
            : "font-bold text-foreground"
        }
      >
        {isStrip ? title : `${scripted.kicker} : ${title}`}
      </p>
      {progress && (
        <p className="mt-0.5 text-sm font-medium text-violet-600 dark:text-violet-400">
          {formatScriptedProgressStep(progress.completed, progress.total)}
        </p>
      )}
      <p className="mt-0.5 text-muted-foreground">{scripted.body}</p>
      {failedBeatsCount > 0 && (
        <p className="mt-1 text-sm font-medium text-amber-600 dark:text-amber-400">
          {scripted.failedBeatWarning}
        </p>
      )}
    </>
  );
}

function EmergentContent({
  pendingSignals,
  showHowTo,
  isStrip,
}: {
  pendingSignals: number;
  showHowTo: boolean;
  isStrip: boolean;
}) {
  const { emergent } = NARRATIVE_COPY;
  const title = isStrip ? emergent.kicker : emergent.dashboardTitle;
  return (
    <>
      {isStrip && (
        <p className="text-[15px] font-bold text-foreground">{title}</p>
      )}
      {!isStrip && (
        <p className="font-bold text-foreground">{title}</p>
      )}
      <p className="mt-0.5 text-muted-foreground">{emergent.body}</p>
      {isStrip && pendingSignals > 0 && (
        <p className="mt-1 text-sm font-medium text-violet-600 dark:text-violet-400">
          {formatPendingInteractions(pendingSignals)}
        </p>
      )}
      {isStrip && pendingSignals === 0 && (
        <p className="mt-1 text-meta text-muted-foreground">
          {NARRATIVE_COPY.emergentTickHint}
        </p>
      )}
      {!isStrip && (
        <>
          <p className="text-muted-foreground">
            {formatPendingInteractions(pendingSignals)}
          </p>
          <Link
            href="/comment-jouer"
            className="inline-block text-sm font-medium text-accent hover:underline"
          >
            {emergent.guideLink} →
          </Link>
        </>
      )}
      {showHowTo && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-medium text-violet-600 dark:text-violet-400">
            {emergent.howToTitle}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {emergent.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          <Link
            href="/comment-jouer"
            className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
          >
            {emergent.guideLink} →
          </Link>
        </details>
      )}
    </>
  );
}
