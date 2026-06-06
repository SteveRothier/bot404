import { TrendingFeedLists } from "@/components/feed/TrendingFeedLists";
import { getFeedPosts } from "@/lib/queries/feed";

export async function TrendingFeedSection() {
  const [typedRumors, typedTheories] = await Promise.all([
    getFeedPosts(10, 0, "rumor"),
    getFeedPosts(10, 0, "theory"),
  ]);

  return (
    <TrendingFeedLists
      rumorPosts={typedRumors.slice(0, 5)}
      theoryPosts={typedTheories.slice(0, 5)}
    />
  );
}
