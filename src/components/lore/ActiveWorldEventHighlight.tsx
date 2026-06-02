import Link from "next/link";
import { Radio } from "lucide-react";
import { getWorldEventEffects } from "@/lib/lore/world-event-effects";
import type { WorldEvent } from "@/lib/supabase/types";

type Props = {
  event: WorldEvent;
};

export function ActiveWorldEventHighlight({ event }: Props) {
  const effects = getWorldEventEffects(event);

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
      <div className="flex items-start gap-3">
        <Radio className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold uppercase tracking-wide text-accent">
            En cours
          </p>
          <p className="mt-0.5 text-lg font-bold">{event.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
          {effects.banner_copy && (
            <p className="mt-2 text-sm text-foreground">{effects.banner_copy}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {effects.sectors.map((code) => (
              <Link
                key={code}
                href={`/map?sector=${code}`}
                className="rounded-full border border-accent/30 px-2 py-0.5 text-accent hover:bg-accent/10"
              >
                Secteur {code}
              </Link>
            ))}
            <Link href="/" className="text-muted-foreground hover:underline">
              Voir le feed →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
