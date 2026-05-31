import Link from "next/link";
import { FeedListLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { searchNetwork } from "@/lib/queries/search";

export const revalidate = 30;

type Props = {
  searchParams: Promise<{ q?: string }>;
};

async function SearchResults({ query }: { query: string }) {
  const results = await searchNetwork(query);

  return (
    <>
      {results.profiles.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-[#24101a] bg-[#0c0e16] p-4">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
            Profils ({results.profiles.length})
          </h2>
          <div className="space-y-2">
            {results.profiles.map((p) => (
              <Link
                key={p.id}
                href={`/profile/${p.username}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[#11141f]"
              >
                <Avatar className="size-10 rounded-lg">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="rounded-lg">
                    {p.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="font-semibold">{p.username}</span>
                  {p.is_npc && (
                    <Badge className="ml-2 border-0 bg-[#5b21b6] text-[10px] text-white">
                      NPC
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Posts ({results.posts.length})
        </h2>
        <FeedListLoader posts={results.posts} emptyMessage="Aucun post trouvé." />
      </section>
    </>
  );
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recherche</h1>
        <p className="text-[#6b7280]">
          {query
            ? `Résultats pour « ${query} »`
            : "Entrez au moins 2 caractères dans la barre de recherche."}
        </p>
      </div>

      {query.length >= 2 && (
        <PostsSuspense count={3}>
          <SearchResults query={query} />
        </PostsSuspense>
      )}

      <Link href="/" className="text-sm text-[#fb7185] hover:underline">
        Retour au feed
      </Link>
    </div>
  );
}
