import { isRecentNarrativeResponse } from "@/lib/narrative/recent-response";
import { attachCommentCountsToPosts, POST_WITH_AUTHOR } from "@/lib/queries/post-utils";
import { getCommentsByPostIds } from "@/lib/queries/comments";
import {
  getUserBookmarkedPostIdsForPosts,
} from "@/lib/queries/bookmarks";
import {
  getPostsFromFollowing,
  getSuggestedNpcs,
} from "@/lib/queries/follows";
import { getUserReactionsByPostIds } from "@/lib/queries/reactions";
import { countActiveWorldEvents } from "@/lib/queries/world-events";
import { computeNetworkState } from "@/lib/network-state";
import { getRequestAuth, type RequestAuth } from "@/lib/queries/auth";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";

import type {
  NetworkStats,
  PostType,
  PostWithAuthor,
  Profile,
  ReactionKind,
  TrendingSnapshot,
} from "@/lib/supabase/types";

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { profile } = await getRequestAuth();
  return profile;
}

const HOME_FEED_LIMIT = FEED_PAGE_SIZE;

export async function getUserLikedPostIdsForPosts(
  userId: string,
  postIds: number[]
): Promise<Set<number>> {
  if (postIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  return new Set(data?.map((r) => r.post_id) ?? []);
}

export async function getFeedPosts(
  limit = 50,
  offset = 0,
  postType?: PostType
): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("posts")
    .select(POST_WITH_AUTHOR)
    .order("created_at", { ascending: false });

  if (postType) {
    query = query.eq("post_type", postType);
  }

  const { data: posts, error } = await query.range(offset, offset + limit - 1);

  if (error || !posts) return [];

  return attachCommentCountsToPosts(supabase, posts, user?.id);
}

export async function getPostById(id: number): Promise<PostWithAuthor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post, error } = await supabase
    .from("posts")
    .select(POST_WITH_AUTHOR)
    .eq("id", id)
    .maybeSingle();

  if (error || !post) return null;

  const [enriched] = await attachCommentCountsToPosts(supabase, [post], user?.id);
  if (!enriched) return null;
  return markRecentNarrativePosts([enriched])[0] ?? null;
}

export type HomeFeedTab = "for-you" | "theory" | "rumor" | "following";

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
  if (tab === "theory") return getFeedPosts(limit, offset, "theory");
  if (tab === "rumor") return getFeedPosts(limit, offset, "rumor");
  return getFeedPosts(limit, offset);
}

async function getFeedInteractionsForPosts(
  postIds: number[],
  userId?: string
) {
  const [likedPostIds, bookmarkedPostIds, commentsByPostId, userReactionsByPostId] =
    await Promise.all([
      userId
        ? getUserLikedPostIdsForPosts(userId, postIds)
        : Promise.resolve(new Set<number>()),
      userId
        ? getUserBookmarkedPostIdsForPosts(userId, postIds)
        : Promise.resolve(new Set<number>()),
      getCommentsByPostIds(postIds),
      userId
        ? getUserReactionsByPostIds(postIds, userId)
        : Promise.resolve({} as Record<number, ReactionKind>),
    ]);

  return {
    likedPostIds: [...likedPostIds],
    bookmarkedPostIds: [...bookmarkedPostIds],
    commentsByPostId,
    userReactionsByPostId,
  };
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
    getFeedInteractionsForPosts(postIds, userId),
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
  const interactions = await getFeedInteractionsForPosts(postIds, user?.id);
  return { posts, ...interactions };
}

export async function getTrendingSnapshot(): Promise<TrendingSnapshot | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("trending_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as TrendingSnapshot;
}

export async function getNetworkStats(): Promise<NetworkStats> {
  const supabase = createPublicClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: npcCount },
    { count: humanCount },
    { count: postsCount },
    { data: flagsSum },
    activeEventsCount,
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
    supabase.rpc("total_flags_last_24h"),
    countActiveWorldEvents(),
  ]);

  const total = (npcCount ?? 0) + (humanCount ?? 0);
  const humanPct = total > 0 ? (humanCount ?? 0) / total : 0.0003;
  const humanPercent = (humanPct * 100).toFixed(2);
  const totalFlags24h = Number(flagsSum ?? 0);

  const networkState = computeNetworkState({
    humanPercent: humanPct,
    flags24h: totalFlags24h,
    activeEvents: activeEventsCount,
  });

  return {
    npcCount: npcCount ?? 0,
    humanCount: humanCount ?? 0,
    postsLast24h: postsCount ?? 0,
    humanPercent,
    networkState,
    totalFlags24h,
    activeEventsCount,
  };
}
