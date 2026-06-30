import { cache } from "react";
import {
  getCachedPopularHashtagsData,
  getCachedShellDataCrossRequest,
} from "@/lib/queries/shell/data-cache";
import { getSidebarAuth } from "@/lib/queries/shell/sidebar-auth";

export const getCachedPopularHashtags = cache((limit = 5) =>
  getCachedPopularHashtagsData(limit)
);
export const getCachedSidebarAuth = cache(getSidebarAuth);
export const getCachedShellData = cache(getCachedShellDataCrossRequest);
