import Link from "next/link";
import { Radio } from "lucide-react";
import {
  formatBoostedTypesLabel,
  getWorldEventEffects,
} from "@/lib/lore/world-event-effects";
import { cn } from "@/lib/utils";
import type { WorldEvent } from "@/lib/supabase/types";

type Props = {
  event: WorldEvent;
  variant?: "feed" | "sidebar";
};

export function WorldEventBanner({ event, variant = "feed" }: Props) {
  const effects = getWorldEventEffects(event);
  const description =
    event.description.length > 120
      ? `${event.description.slice(0, 117)}…`
      : event.description;
  const impact = effects.banner_copy;
  const boosted = formatBoostedTypesLabel(effects.boost_post_types);

  return (
    <div
      className={cn(
        "bg-accent/5",
        variant === "sidebar"
          ? "rounded-2xl border border-accent/30 p-3"
          : "border-b border-accent/30 px-4 py-3"
      )}
    >
      <div className="flex items-start gap-3">
        <Radio
          className="mt-0.5 size-4 shrink-0 text-accent"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold uppercase tracking-wide text-accent">
            Événement mondial actif
          </p>
          <p className="mt-0.5 text-[15px] font-bold text-foreground">
            {event.title}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          {impact && (
            <p className="mt-1 text-sm text-foreground/90">{impact}</p>
          )}
          {boosted && (
            <p className="mt-1 text-meta text-accent">
              Types amplifiés : {boosted}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {effects.sectors.map((code) => (
              <Link
                key={code}
                href={`/map?sector=${code}`}
                className="text-accent hover:underline"
              >
                Carte · {code}
              </Link>
            ))}
            {effects.unlock_archive_slug && (
              <Link
                href={`/archives/${effects.unlock_archive_slug}`}
                className="text-accent hover:underline"
              >
                Archive liée
              </Link>
            )}
            <Link href="/trending" className="text-muted-foreground hover:underline">
              Historique →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
