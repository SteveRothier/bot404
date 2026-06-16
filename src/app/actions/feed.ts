"use server";

import { getCommentById } from "@/lib/queries/comments";
import {
  getFeedPosts,
  getHomeFeedTabBundle,
  getPostById,
  loadMoreHomeFeedTab,
  markRecentNarrativePosts,
  type HomeFeedTab,
} from "@/lib/queries/feed";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import type { CommentWithAuthor, PostWithAuthor } from "@/lib/supabase/types";

export async function loadMoreFeedPosts(
  offset: number,
  limit = FEED_PAGE_SIZE
): Promise<PostWithAuthor[]> {
  return markRecentNarrativePosts(await getFeedPosts(limit, offset));
}

export async function loadHomeFeedTab(tab: HomeFeedTab) {
  return getHomeFeedTabBundle(tab);
}

export async function loadMoreFeedTab(tab: HomeFeedTab, offset: number) {
  return loadMoreHomeFeedTab(tab, offset);
}

export async function fetchFeedPostById(
  postId: number
): Promise<PostWithAuthor | null> {
  return getPostById(postId);
}

export async function fetchFeedCommentById(
  commentId: number
): Promise<CommentWithAuthor | null> {
  return getCommentById(commentId);
}
