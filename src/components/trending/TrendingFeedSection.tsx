import { TrendingFeedLists } from "@/components/feed/TrendingFeedLists";
import { getFeedPosts } from "@/lib/queries/feed";

export async function TrendingFeedSection() {
  const [rumorPosts, theoryPosts] = await Promise.all([
    getFeedPosts(5, 0, "rumor"),
    getFeedPosts(5, 0, "theory"),
  ]);

  return (
    <TrendingFeedLists rumorPosts={rumorPosts} theoryPosts={theoryPosts} />
  );
}
