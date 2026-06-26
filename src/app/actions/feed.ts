"use server";

import { getCommentById } from "@/lib/queries/posts";
import {
  getHomeFeedTabBundle,
  getPostById,
  loadMoreHomeFeedTab,
  type HomeFeedTab,
} from "@/lib/queries/feed";
import type { CommentWithAuthor, PostWithAuthor } from "@/lib/supabase/types";

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
