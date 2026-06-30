import { unstable_cache } from "next/cache";
import { getNetworkStats } from "@/lib/queries/feed";
import { getPopularHashtags } from "@/lib/queries/explore";
import { getShellData } from "@/lib/queries/shell/shell-data";
import { CACHE_TAGS } from "@/lib/queries/shell/cache-tags";

export { CACHE_TAGS } from "@/lib/queries/shell/cache-tags";

export const getCachedNetworkStatsData = unstable_cache(
  getNetworkStats,
  ["network-stats"],
  { revalidate: 60, tags: [CACHE_TAGS.networkStats] }
);

export const getCachedPopularHashtagsData = unstable_cache(
  async (limit: number) => getPopularHashtags(limit),
  ["popular-hashtags"],
  { revalidate: 120, tags: [CACHE_TAGS.hashtags] }
);

export const getCachedShellDataCrossRequest = unstable_cache(
  getShellData,
  ["shell-data"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.shell, CACHE_TAGS.networkStats, CACHE_TAGS.hashtags],
  }
);
