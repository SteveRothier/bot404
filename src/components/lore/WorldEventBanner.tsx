import Link from "next/link";
import { Radio } from "lucide-react";
import type { WorldEvent } from "@/lib/supabase/types";

type Props = {
  event: WorldEvent;
};

export function WorldEventBanner({ event }: Props) {
  const description =
    event.description.length > 120
      ? `${event.description.slice(0, 117)}…`
      : event.description;

  return (
    <div className="border-b border-accent/30 bg-accent/5 px-4 py-3">
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
          <Link
            href="/trending"
            className="mt-1 inline-block text-sm text-accent hover:underline"
          >
            Voir l&apos;historique →
          </Link>
        </div>
      </div>
    </div>
  );
}
