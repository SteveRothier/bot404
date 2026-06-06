import { unstable_cache } from "next/cache";
import { getFactions } from "@/lib/queries/factions";
import { getNetworkStats, getTrendingSnapshot } from "@/lib/queries/feed";
import { getPopularHashtags } from "@/lib/queries/hashtags";
import { getShellData } from "@/lib/queries/shell-data";
import { getActiveWorldEvents } from "@/lib/queries/world-events";
import { CACHE_TAGS } from "@/lib/queries/cache-tags";

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

export const getCachedFactionsData = unstable_cache(
  getFactions,
  ["factions"],
  { revalidate: 60, tags: [CACHE_TAGS.factions] }
);

export const getCachedActiveWorldEventsData = unstable_cache(
  getActiveWorldEvents,
  ["active-world-events"],
  { revalidate: 60, tags: [CACHE_TAGS.worldEvents] }
);

export const getCachedTrendingSnapshotData = unstable_cache(
  getTrendingSnapshot,
  ["trending-snapshot"],
  { revalidate: 120, tags: [CACHE_TAGS.hashtags] }
);

export const getCachedShellDataCrossRequest = unstable_cache(
  getShellData,
  ["shell-data"],
  {
    revalidate: 60,
    tags: [
      CACHE_TAGS.shell,
      CACHE_TAGS.networkStats,
      CACHE_TAGS.hashtags,
      CACHE_TAGS.factions,
      CACHE_TAGS.worldEvents,
    ],
  }
);
