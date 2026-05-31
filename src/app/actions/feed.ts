"use server";

import { getFeedPosts } from "@/lib/queries/feed";
import type { PostWithAuthor } from "@/lib/supabase/types";

export async function loadMoreFeedPosts(
  offset: number,
  limit = 20
): Promise<PostWithAuthor[]> {
  return getFeedPosts(limit, offset);
}
