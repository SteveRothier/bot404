"use server";

import {
  getFeedPosts,
  getHomeFeedTabBundle,
  markRecentNarrativePosts,
  type HomeFeedTab,
} from "@/lib/queries/feed";
import type { PostWithAuthor } from "@/lib/supabase/types";

export async function loadMoreFeedPosts(
  offset: number,
  limit = 20
): Promise<PostWithAuthor[]> {
  return markRecentNarrativePosts(await getFeedPosts(limit, offset));
}

export async function loadHomeFeedTab(tab: HomeFeedTab) {
  return getHomeFeedTabBundle(tab);
}
