import Link from "next/link";
import { FeedListLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { ActiveWorldEventHighlight } from "@/components/lore/ActiveWorldEventHighlight";
import { getWorldEventEffects } from "@/lib/lore/world-event-effects";
import { SECTOR_STATUS_LABELS, getPostsBySector, getSectors } from "@/lib/queries/sectors";
import { getCachedActiveWorldEvents } from "@/lib/queries/world-events";
import { cn } from "@/lib/utils";
import type { Sector, SectorStatus } from "@/lib/supabase/types";

export const revalidate = 60;

const STATUS_STYLE: Record<SectorStatus, string> = {
  stable: "border-border bg-secondary/40",
  ai_activity: "border-violet-500/40 bg-violet-500/10",
  conflict: "border-amber-500/40 bg-amber-500/10",
  blackout: "border-destructive/40 bg-destructive/10",
  unknown_signal: "border-accent/40 bg-accent/10",
};

async function SectorPosts({ code }: { code: string }) {
  const posts = await getPostsBySector(code, 5);
  return (
    <FeedListLoader
      posts={posts}
      emptyMessage="Aucun signal dans ce secteur."
    />
  );
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ sector?: string }>;
}) {
  const { sector: selectedCode } = await searchParams;
  const [sectors, activeEvents] = await Promise.all([
    getSectors(),
    getCachedActiveWorldEvents(),
  ]);
  const activeEvent = activeEvents[0] ?? null;
  const hotSectors = activeEvent
    ? getWorldEventEffects(activeEvent).sectors
    : [];

  return (
    <div className="w-full divide-y divide-border">
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold">Carte du réseau</h1>
        <p className="mt-1 text-meta text-muted-foreground">
          Secteurs du réseau Bot404 — état en temps quasi réel
        </p>
      </div>

      {activeEvent && hotSectors.length > 0 && (
        <section className="px-4 py-4">
          <ActiveWorldEventHighlight event={activeEvent} />
        </section>
      )}

      <section className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        {sectors.map((s: Sector) => (
          <Link
            key={s.code}
            href={`/map?sector=${s.code}`}
            className={cn(
              "rounded-lg border p-3 transition-colors hover:opacity-90",
              STATUS_STYLE[s.status],
              selectedCode === s.code && "ring-2 ring-accent",
              hotSectors.includes(s.code) && "ring-1 ring-accent/60"
            )}
          >
            <p className="text-lg font-bold">{s.code}</p>
            <p className="text-meta text-muted-foreground">{s.name}</p>
            <p className="mt-2 text-meta">
              {SECTOR_STATUS_LABELS[s.status] ?? s.status}
            </p>
            <p className="text-meta text-muted-foreground">
              Stab. {s.stability}% · IA {s.ai_activity}%
            </p>
          </Link>
        ))}
      </section>

      {selectedCode && (
        <section className="px-4 py-4">
          <h2 className="mb-3 text-[15px] font-bold">
            Signaux — secteur {selectedCode}
          </h2>
          <PostsSuspense count={2}>
            <SectorPosts code={selectedCode} />
          </PostsSuspense>
        </section>
      )}
    </div>
  );
}
