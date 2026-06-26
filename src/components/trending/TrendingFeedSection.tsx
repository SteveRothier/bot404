import { FeedListLoader } from "@/components/feed/FeedServer";
import { getFeedPosts } from "@/lib/queries/feed";
import type { RequestAuth } from "@/lib/queries/shell";

type Props = {
  referenceNowMs?: number;
  auth?: RequestAuth;
};

export async function TrendingFeedSection({
  referenceNowMs = Date.now(),
  auth,
}: Props) {
  const posts = await getFeedPosts(10, 0);

  return (
    <section className="px-4 py-4">
      <h2 className="mb-3 text-[15px] font-bold">Posts récents</h2>
      <FeedListLoader
        posts={posts}
        referenceNowMs={referenceNowMs}
        auth={auth}
        emptyMessage="Aucun post pour l'instant."
      />
    </section>
  );
}
