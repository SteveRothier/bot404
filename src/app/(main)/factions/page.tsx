import { FactionsListLive } from "@/components/factions/FactionsListLive";
import { ActiveWorldEventHighlight } from "@/components/lore/ActiveWorldEventHighlight";
import { FactionControlLive } from "@/components/widgets/FactionControlLive";
import { getCachedFactions } from "@/lib/queries/cached";
import { getNpcMembersByFaction } from "@/lib/queries/factions";
import { getCachedActiveWorldEvents } from "@/lib/queries/world-events";
import { getWorldEventEffects } from "@/lib/lore/world-event-effects";

export const revalidate = 30;

export default async function FactionsPage() {
  const [factions, membersByFaction, activeEvents] = await Promise.all([
    getCachedFactions(),
    getNpcMembersByFaction(),
    getCachedActiveWorldEvents(),
  ]);

  const activeEvent = activeEvents[0] ?? null;
  const eventEffects = activeEvent
    ? getWorldEventEffects(activeEvent)
    : null;
  const highlightedFactions = eventEffects?.factions ?? [];

  return (
    <div className="w-full divide-y divide-border">
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold">Factions</h1>
        <p className="mt-1 text-meta text-muted-foreground">
          Contrôle du réseau et alignements NPC
        </p>
      </div>

      {activeEvent && (
        <section className="px-4 py-4">
          <ActiveWorldEventHighlight event={activeEvent} />
          {highlightedFactions.length > 0 && (
            <p className="mt-2 text-meta text-muted-foreground">
              Factions sous tension : {highlightedFactions.join(", ")}
            </p>
          )}
        </section>
      )}

      <section className="px-4 py-4">
        <FactionControlLive />
      </section>

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold">Les quatre factions</h2>
        <FactionsListLive
          factions={factions}
          membersByFaction={membersByFaction}
        />
      </section>
    </div>
  );
}
