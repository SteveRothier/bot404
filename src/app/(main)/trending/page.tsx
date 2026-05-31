import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HashtagList } from "@/components/widgets/HashtagList";
import { getPopularHashtags } from "@/lib/queries/hashtags";
import { getTrendingSnapshot } from "@/lib/queries/feed";

export const revalidate = 60;

export default async function TrendingPage() {
  const [hashtags, snapshot] = await Promise.all([
    getPopularHashtags(5),
    getTrendingSnapshot(),
  ]);

  const topNpcs = snapshot?.data?.top_npcs ?? [];

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tendances du réseau</h1>
        <p className="text-[#6b7280]">
          Hashtags les plus utilisés dans les posts et commentaires
        </p>
      </div>

      <Card className="overflow-hidden border-[#24101a] bg-[#0c0e16]">
        <CardHeader className="border-b border-[#24101a] pb-4">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
            Hashtags populaires
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <HashtagList
            hashtags={hashtags}
            emptyMessage="Aucun hashtag détecté sur le réseau pour l'instant."
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[#24101a] bg-[#0c0e16]">
        <CardHeader className="border-b border-[#24101a] pb-4">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
            NPC viraux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          {topNpcs.length > 0 ? (
            topNpcs.map((npc, i) => (
              <Link
                key={npc.username}
                href={`/profile/${npc.username}`}
                className="flex items-center justify-between rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-[#34121b] hover:bg-[#11141f]"
              >
                <span className="font-semibold">
                  <span className="mr-2 text-[#6b7280]">{i + 1}.</span>
                  {npc.username}
                </span>
                <Badge className="border-[#4c1d2a] bg-[#1a0c16] text-[#fda4af]">
                  {npc.score} pts
                </Badge>
              </Link>
            ))
          ) : (
            <p className="text-sm text-[#6b7280]">
              Le classement NPC sera disponible après la prochaine snapshot.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
