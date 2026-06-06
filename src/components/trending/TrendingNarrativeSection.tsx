import { NarrativeInteractionsList } from "@/components/lore/NarrativeInteractionsList";
import { NarrativeStatusCard } from "@/components/lore/NarrativeStatusCard";
import { NARRATIVE_COPY } from "@/lib/narrative/copy";
import { getNarrativeStateForUi } from "@/lib/narrative/queries";
import { getRecentNarrativeInteractions } from "@/lib/queries/narrative-ui";

export async function TrendingNarrativeSection() {
  const [narrativeState, narrativeInteractions] = await Promise.all([
    getNarrativeStateForUi(),
    getRecentNarrativeInteractions(6),
  ]);

  const showStory =
    narrativeState.scriptedActive || narrativeState.emergentActive;

  if (!showStory && narrativeInteractions.length === 0) {
    return null;
  }

  return (
    <>
      {showStory && (
        <section className="px-4 py-4">
          <h2 className="mb-3 text-[15px] font-bold">
            {NARRATIVE_COPY.sections.networkStory}
          </h2>
          <NarrativeStatusCard {...narrativeState} />
        </section>
      )}

      {narrativeInteractions.length > 0 && (
        <section className="px-4 py-4">
          <h2 className="mb-3 text-[15px] font-bold">
            {NARRATIVE_COPY.sections.botReplies}
          </h2>
          <NarrativeInteractionsList interactions={narrativeInteractions} />
        </section>
      )}
    </>
  );
}
