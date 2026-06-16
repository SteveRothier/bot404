import Link from "next/link";
import { Radio } from "lucide-react";
import { WorldEventCountdown } from "@/components/lore/WorldEventCountdown";
import {
  formatBoostedTypesLabel,
  getWorldEventEffects,
} from "@/lib/lore/world-event-effects";
import type { WorldEvent } from "@/lib/supabase/types";

type Props = {
  event: WorldEvent;
};

export function ActiveWorldEventStrip({ event }: Props) {
  const effects = getWorldEventEffects(event);
  const boosted = formatBoostedTypesLabel(effects.boost_post_types);
  const impact =
    effects.banner_copy ??
    "Le réseau adapte son flux en conséquence de cet événement.";

  return (
    <div className="border-b border-accent/25 bg-accent/5 px-4 py-2.5">
      <div className="flex items-start gap-2">
        <Radio
          className="mt-0.5 size-4 shrink-0 text-accent"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-foreground">{event.title}</p>
          <p className="mt-0.5 text-muted-foreground">{impact}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
            {event.ends_at && (
              <WorldEventCountdown endsAt={event.ends_at} />
            )}
            {boosted && (
              <span className="text-accent">Feed : {boosted} amplifiés</span>
            )}
            <Link href="/trending" className="text-muted-foreground hover:underline">
              Détails →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
