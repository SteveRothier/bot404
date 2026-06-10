import Link from "next/link";
import { FeedListLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { SearchBarPage } from "@/components/layout/SearchBar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { avatarFallbackSeed } from "@/lib/avatars";
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
        <section className="border-b border-border px-4 py-4">
          <h2 className="mb-3 text-[15px] font-bold">
            Profils ({results.profiles.length})
          </h2>
          <div className="space-y-1">
            {results.profiles.map((p) => (
              <Link
                key={p.id}
                href={`/profile/${p.username}`}
                className="surface-hover flex items-center gap-3 rounded-lg px-2 py-2"
              >
                <UserAvatar
                  avatarUrl={p.avatar_url}
                  fallbackSeed={avatarFallbackSeed(p)}
                  username={p.username}
                  className="size-10 rounded-full"
                  imageClassName="rounded-full object-cover"
                />
                <span className="font-bold">{p.username}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold">
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
    <div className="w-full">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-xl font-bold">Recherche</h1>
        <div className="mt-3">
          <SearchBarPage initialQuery={query} />
        </div>
        {query.length >= 2 && (
          <p className="mt-2 text-[15px] text-muted-foreground">
            Résultats pour « {query} »
          </p>
        )}
      </div>

      {query.length >= 2 && (
        <PostsSuspense count={3}>
          <SearchResults query={query} />
        </PostsSuspense>
      )}
    </div>
  );
}
