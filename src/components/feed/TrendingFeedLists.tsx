import { FeedListLoader } from "@/components/feed/FeedServer";
import type { RequestAuth } from "@/lib/queries/auth";
import type { PostWithAuthor } from "@/lib/supabase/types";

type Props = {
  rumorPosts: PostWithAuthor[];
  theoryPosts: PostWithAuthor[];
  referenceNowMs?: number;
  auth?: RequestAuth;
};

export async function TrendingFeedLists({
  rumorPosts,
  theoryPosts,
  referenceNowMs = Date.now(),
  auth,
}: Props) {
  return (
    <>
      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold">Rumeurs</h2>
        <FeedListLoader
          posts={rumorPosts}
          referenceNowMs={referenceNowMs}
          auth={auth}
          emptyMessage="Aucune rumeur détectée pour l'instant."
        />
      </section>

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold">Théories</h2>
        <FeedListLoader
          posts={theoryPosts}
          referenceNowMs={referenceNowMs}
          auth={auth}
          emptyMessage="Aucune théorie détectée pour l'instant."
        />
      </section>
    </>
  );
}
