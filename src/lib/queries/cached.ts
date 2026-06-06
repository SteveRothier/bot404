import { cache } from "react";
import {
  getCachedActiveWorldEventsData,
  getCachedFactionsData,
  getCachedNetworkStatsData,
  getCachedPopularHashtagsData,
  getCachedShellDataCrossRequest,
  getCachedTrendingSnapshotData,
} from "@/lib/queries/data-cache";
import { getSidebarAuth } from "@/lib/queries/sidebar-auth";

export const getCachedFactions = cache(getCachedFactionsData);
export const getCachedNetworkStats = cache(getCachedNetworkStatsData);
export const getCachedPopularHashtags = cache((limit = 5) =>
  getCachedPopularHashtagsData(limit)
);
export const getCachedTrendingSnapshot = cache(getCachedTrendingSnapshotData);
export const getCachedActiveWorldEvents = cache(getCachedActiveWorldEventsData);
export const getCachedSidebarAuth = cache(getSidebarAuth);
export const getCachedShellData = cache(getCachedShellDataCrossRequest);
