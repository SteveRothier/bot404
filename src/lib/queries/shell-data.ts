import { getPopularHashtags } from "@/lib/queries/hashtags";
import { getNetworkStats, getTrendingSnapshot } from "@/lib/queries/feed";

export async function getShellData() {
  const [stats, snapshot, hashtags] = await Promise.all([
    getNetworkStats(),
    getTrendingSnapshot(),
    getPopularHashtags(5),
  ]);

  return {
    stats,
    hashtags,
    event: snapshot?.data?.event ?? null,
  };
}
