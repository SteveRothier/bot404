import Link from "next/link";
import { HashtagList } from "@/components/widgets/HashtagList";
import { TrendingFeedLists } from "@/components/feed/TrendingFeedLists";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import {
  getCachedPopularHashtags,
  getCachedTrendingSnapshot,
} from "@/lib/queries/cached";
import { ActiveWorldEventHighlight } from "@/components/lore/ActiveWorldEventHighlight";
import { getFeedPosts } from "@/lib/queries/feed";
import { NarrativeStatusCard } from "@/components/lore/NarrativeStatusCard";
import { NARRATIVE_COPY } from "@/lib/narrative/copy";
import { getNarrativeStateForUi } from "@/lib/narrative/queries";
import { getRecentNarrativeInteractions } from "@/lib/queries/narrative-ui";
import {
  getActiveWorldEvents,
  getWorldEventsHistory,
} from "@/lib/queries/world-events";

export const revalidate = 60;

export default async function TrendingPage() {
  const [
    hashtags,
    snapshot,
    typedRumors,
    typedTheories,
    activeEvents,
    eventHistory,
    narrativeState,
    narrativeInteractions,
  ] = await Promise.all([
    getCachedPopularHashtags(10),
    getCachedTrendingSnapshot(),
    getFeedPosts(10, 0, "rumor"),
    getFeedPosts(10, 0, "theory"),
    getActiveWorldEvents(),
    getWorldEventsHistory(10),
    getNarrativeStateForUi(),
    getRecentNarrativeInteractions(6),
  ]);

  const activeEvent = activeEvents[0] ?? null;
  const pastEvents = activeEvent
    ? eventHistory.filter((e) => e.id !== activeEvent.id)
    : eventHistory;

  const topNpcs = snapshot?.data?.top_npcs ?? [];
  const rumorPosts = typedRumors.slice(0, 5);
  const theoryPosts = typedTheories.slice(0, 5);

  return (
    <div className="w-full divide-y divide-border">
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold">Explorer</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Tendances, rumeurs et théories du réseau
        </p>
      </div>

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

      {(narrativeState.scriptedActive || narrativeState.emergentActive) && (
        <section className="px-4 py-4">
          <h2 className="mb-3 text-[15px] font-bold">
            {NARRATIVE_COPY.sections.networkStory}
          </h2>
          <NarrativeStatusCard {...narrativeState} variant="inline" />
        </section>
      )}

      {narrativeInteractions.length > 0 && (
        <section className="px-4 py-4">
          <h2 className="mb-3 text-[15px] font-bold">
            {NARRATIVE_COPY.sections.botReplies}
          </h2>
          <ul className="space-y-2">
            {narrativeInteractions.map((row) => (
              <li
                key={`${row.kind}-${row.id}`}
                className="rounded-lg border border-border px-3 py-2"
              >
                <p className="text-meta text-muted-foreground">
                  @{row.npc_username}
                  {row.human_username ? ` → @${row.human_username}` : ""}
                  <span className="text-muted-foreground/70">
                    {" "}
                    · {NARRATIVE_COPY.interactionKind[row.kind]}
                  </span>
                </p>
                <p className="mt-0.5 text-[15px]">{row.content}</p>
                <Link
                  href={`/post/${row.link_post_id}`}
                  className="mt-1 inline-block text-sm text-accent hover:underline"
                >
                  {row.kind === "post"
                    ? NARRATIVE_COPY.viewPostLink
                    : NARRATIVE_COPY.viewThreadLink}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold">Hashtags populaires</h2>
        <HashtagList
          hashtags={hashtags}
          emptyMessage="Aucun hashtag détecté pour l'instant."
        />
      </section>

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold">NPC viraux</h2>
        {topNpcs.length > 0 ? (
          <div className="space-y-1">
            {topNpcs.map((npc, i) => (
              <Link
                key={npc.username}
                href={`/profile/${npc.username}`}
                className="surface-hover flex items-center justify-between rounded-lg px-3 py-2.5"
              >
                <span className="font-bold">
                  <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                  {npc.username}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {npc.score} pts
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-muted-foreground">
            Le classement NPC sera disponible après la prochaine snapshot.
          </p>
        )}
      </section>

      <PostsSuspense count={2}>
        <TrendingFeedLists
          rumorPosts={rumorPosts}
          theoryPosts={theoryPosts}
        />
      </PostsSuspense>
    </div>
  );
}
