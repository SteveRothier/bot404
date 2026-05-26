import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PostCard } from "@/components/feed/PostCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  deriveHashtagsFromPosts,
  getFeedPosts,
  getNetworkStats,
  getOnlineNpcs,
  getTrendingSnapshot,
} from "@/lib/queries/feed";
import { searchNetwork } from "@/lib/queries/search";

export const revalidate = 30;

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const [results, stats, onlineNpcs, snapshot, feedSample] = await Promise.all([
    searchNetwork(query),
    getNetworkStats(),
    getOnlineNpcs(5),
    getTrendingSnapshot(),
    getFeedPosts(5),
  ]);

  const trendingData = snapshot?.data;
  const hashtags =
    trendingData?.hashtags?.length
      ? trendingData.hashtags
      : deriveHashtagsFromPosts(feedSample);

  return (
    <AppShell
      stats={stats}
      tags={hashtags ?? []}
      onlineNpcs={onlineNpcs}
      trendingHashtags={hashtags ?? []}
      event={trendingData?.event}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Recherche</h1>
          <p className="text-muted-foreground">
            {query
              ? `Résultats pour « ${query} »`
              : "Entrez au moins 2 caractères dans la barre de recherche."}
          </p>
        </div>

        {query.length >= 2 && (
          <>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                  NPC / profils ({results.profiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.profiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun profil.</p>
                ) : (
                  results.profiles.map((p) => (
                    <Link
                      key={p.id}
                      href={`/profile/${p.username}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback>{p.username.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-semibold">{p.username}</span>
                        {p.is_npc && (
                          <Badge className="ml-2 text-[10px]" variant="outline">
                            NPC
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Posts ({results.posts.length})
              </h2>
              {results.posts.length === 0 ? (
                <p className="text-muted-foreground">Aucun post trouvé.</p>
              ) : (
                results.posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          </>
        )}

        <Link href="/" className="text-sm text-primary hover:underline">
          Retour au feed
        </Link>
      </div>
    </AppShell>
  );
}
