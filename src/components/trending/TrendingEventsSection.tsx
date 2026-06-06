import { ActiveWorldEventHighlight } from "@/components/lore/ActiveWorldEventHighlight";
import { getCachedActiveWorldEvents } from "@/lib/queries/cached";
import { getWorldEventsHistory } from "@/lib/queries/world-events";

export async function TrendingEventsSection() {
  const [activeEvents, eventHistory] = await Promise.all([
    getCachedActiveWorldEvents(),
    getWorldEventsHistory(10),
  ]);

  const activeEvent = activeEvents[0] ?? null;
  const pastEvents = activeEvent
    ? eventHistory.filter((e) => e.id !== activeEvent.id)
    : eventHistory;

  return (
    <section className="space-y-4 px-4 py-4">
      <h2 className="text-[15px] font-bold">Événements mondiaux</h2>
      {activeEvent ? (
        <ActiveWorldEventHighlight event={activeEvent} />
      ) : (
        <p className="text-meta text-muted-foreground">
          Aucun événement actif pour le moment.
        </p>
      )}
      {pastEvents.length > 0 && (
        <div>
          <h3 className="mb-2 text-meta font-semibold uppercase tracking-wide text-muted-foreground">
            Historique
          </h3>
          <ul className="space-y-2">
            {pastEvents.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-border px-3 py-2"
              >
                <p className="font-bold">{ev.title}</p>
                <p className="text-meta text-muted-foreground">
                  {ev.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!activeEvent && pastEvents.length === 0 && (
        <p className="text-meta text-muted-foreground">
          Aucun événement enregistré.
        </p>
      )}
    </section>
  );
}
