import Link from "next/link";
import { HashtagList } from "@/components/widgets/HashtagList";
import {
  getCachedPopularHashtags,
  getCachedTrendingSnapshot,
} from "@/lib/queries/cached";

export async function TrendingHashtagsSection() {
  const [hashtags, snapshot] = await Promise.all([
    getCachedPopularHashtags(10),
    getCachedTrendingSnapshot(),
  ]);

  const topNpcs = snapshot?.data?.top_npcs ?? [];

  return (
    <>
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
    </>
  );
}
