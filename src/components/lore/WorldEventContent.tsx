import Link from "next/link";
import { Radio } from "lucide-react";
import { WorldEventCountdown } from "@/components/lore/WorldEventCountdown";
import {
  formatBoostedTypesLabel,
  getWorldEventEffects,
} from "@/lib/lore/world-event-effects";
import { cn } from "@/lib/utils";
import type { WorldEvent } from "@/lib/supabase/types";

type Variant = "compact" | "strip" | "sidebar";

type Props = {
  event: WorldEvent;
  variant?: Variant;
};

export function WorldEventContent({ event, variant = "compact" }: Props) {
  const effects = getWorldEventEffects(event);
  const boosted = formatBoostedTypesLabel(effects.boost_post_types);
  const description =
    variant === "sidebar" && event.description.length > 120
      ? `${event.description.slice(0, 117)}…`
      : event.description;
  const impact =
    effects.banner_copy ??
    (variant === "strip"
      ? "Le réseau adapte son flux en conséquence de cet événement."
      : null);

  const iconClass =
    variant === "compact"
      ? "mt-0.5 size-5 shrink-0 text-accent"
      : "mt-0.5 size-4 shrink-0 text-accent";

  const shellClass = cn(
    variant === "compact" && "rounded-xl border border-accent/40 bg-accent/10 px-4 py-3",
    variant === "strip" && "border-b border-accent/25 bg-accent/5 px-4 py-2.5",
    variant === "sidebar" &&
      "rounded-lg border border-accent/30 bg-accent/5 p-3"
  );

  return (
    <div className={shellClass}>
      <div className="flex items-start gap-3">
        <Radio className={iconClass} strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          {variant === "compact" && (
            <p className="text-meta font-semibold uppercase tracking-wide text-accent">
              En cours
            </p>
          )}
          {variant === "sidebar" && (
            <p className="text-meta font-semibold uppercase tracking-wide text-accent">
              Événement mondial actif
            </p>
          )}
          <p
            className={cn(
              "font-bold text-foreground",
              variant === "compact" && "mt-0.5 text-lg",
              variant === "strip" && "text-sm font-semibold",
              variant === "sidebar" && "mt-0.5 text-[15px]"
            )}
          >
            {event.title}
          </p>
          {variant !== "strip" && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
          {impact && (
            <p
              className={cn(
                "text-sm",
                variant === "strip"
                  ? "mt-0.5 text-muted-foreground"
                  : "mt-1 text-foreground/90"
              )}
            >
              {impact}
            </p>
          )}
          {variant === "compact" && effects.related_hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {effects.related_hashtags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="rounded-full border border-accent/30 px-2 py-0.5 text-sm text-accent hover:bg-accent/10"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          {boosted && variant !== "compact" && (
            <p className="mt-1 text-meta text-accent">
              {variant === "strip" ? `Feed : ${boosted} amplifiés` : `Types amplifiés : ${boosted}`}
            </p>
          )}
          <div
            className={cn(
              "flex flex-wrap gap-x-3 gap-y-1",
              variant === "strip" ? "mt-1.5 items-center text-meta" : "mt-2 text-sm"
            )}
          >
            {variant === "strip" && event.ends_at && (
              <WorldEventCountdown endsAt={event.ends_at} />
            )}
            {variant === "compact" && (
              <Link href="/" className="text-muted-foreground hover:underline">
                Voir le feed →
              </Link>
            )}
            {(variant === "strip" || variant === "sidebar") && (
              <Link
                href="/trending"
                className="text-muted-foreground hover:underline"
              >
                {variant === "strip" ? "Détails →" : "Historique →"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
