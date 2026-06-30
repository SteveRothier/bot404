import { isRecentNarrativeResponse } from "@/lib/engine/reactive/recent-response";
import { attachCommentCountsToPosts, fetchEnrichedPosts } from "@/lib/queries/posts";
import {
  getPostsFromFollowing,
  getSuggestedNpcs,
} from "@/lib/queries/social";
import { resolvePostInteractions } from "@/lib/queries/feed/feed-context";
import { computeNetworkState } from "@/lib/network-state";
import { getRequestAuth, type RequestAuth } from "@/lib/queries/shell";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";

import type {
  NetworkStats,
  PostType,
  PostWithAuthor,
  Profile,
} from "@/lib/supabase/types";

const HOME_FEED_LIMIT = FEED_PAGE_SIZE;

export async function getFeedPosts(
  limit = 50,
  offset = 0,
  postType?: PostType
): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return fetchEnrichedPosts(
    supabase,
    { limit, offset, postType },
    user?.id
  );
}

export async function getPostById(id: number): Promise<PostWithAuthor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !post) return null;

  const [enriched] = await attachCommentCountsToPosts(supabase, [post], user?.id);
  if (!enriched) return null;
  return markRecentNarrativePosts([enriched])[0] ?? null;
}

export type HomeFeedTab = "for-you" | "following";

export function markRecentNarrativePosts(posts: PostWithAuthor[]): PostWithAuthor[] {
  return posts.map((post) => ({
    ...post,
    isRecentNarrativeResponse:
      !!post.narrative_signal_id &&
      post.author.is_npc &&
      isRecentNarrativeResponse(post.created_at),
  }));
}

export async function getPostsForHomeFeedTab(
  tab: HomeFeedTab,
  limit = HOME_FEED_LIMIT,
  hasUser = false,
  offset = 0
): Promise<PostWithAuthor[]> {
  if (tab === "following") {
    return hasUser ? getPostsFromFollowing(limit, offset) : [];
  }
  return getFeedPosts(limit, offset);
}

export async function getHomeFeedTabBundle(
  tab: HomeFeedTab,
  auth?: RequestAuth
) {
  const { user } = auth ?? (await getRequestAuth());
  const userId = user?.id;
  const posts = markRecentNarrativePosts(
    await getPostsForHomeFeedTab(tab, HOME_FEED_LIMIT, !!user, 0)
  );
  const postIds = posts.map((p) => p.id);
  const [interactions, suggestedNpcs] = await Promise.all([
    resolvePostInteractions(postIds, userId),
    tab === "following" && user
      ? getSuggestedNpcs(3)
      : Promise.resolve([] as Profile[]),
  ]);

  return { posts, suggestedNpcs, ...interactions };
}

export async function loadMoreHomeFeedTab(
  tab: HomeFeedTab,
  offset: number,
  auth?: RequestAuth
) {
  const { user } = auth ?? (await getRequestAuth());
  const posts = markRecentNarrativePosts(
    await getPostsForHomeFeedTab(tab, HOME_FEED_LIMIT, !!user, offset)
  );
  const postIds = posts.map((p) => p.id);
  const interactions = await resolvePostInteractions(postIds, user?.id);
  return { posts, ...interactions };
}

export async function getNetworkStats(): Promise<NetworkStats> {
  const supabase = createPublicClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: npcCount },
    { count: humanCount },
    { count: postsCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_npc", true),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_npc", false),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since24h),
  ]);

  const total = (npcCount ?? 0) + (humanCount ?? 0);
  const humanPct = total > 0 ? (humanCount ?? 0) / total : 0.0003;
  const humanPercent = (humanPct * 100).toFixed(2);

  const networkState = computeNetworkState({
    humanPercent: humanPct,
  });

  return {
    npcCount: npcCount ?? 0,
    humanCount: humanCount ?? 0,
    postsLast24h: postsCount ?? 0,
    humanPercent,
    networkState,
  };
}
