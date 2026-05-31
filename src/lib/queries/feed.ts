import { attachCommentCountsToPosts } from "@/lib/queries/post-utils";
import { getCommentsByPostIds } from "@/lib/queries/comments";
import { getUserBookmarkedPostIds } from "@/lib/queries/bookmarks";
import {
  getPostsFromFollowing,
  getSuggestedNpcs,
} from "@/lib/queries/follows";
import { createClient } from "@/lib/supabase/server";
import type {
  NetworkStats,
  PostWithAuthor,
  Profile,
  TrendingSnapshot,
} from "@/lib/supabase/types";

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
}

export async function getUserLikedPostIds(): Promise<Set<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id);

  return new Set(data?.map((r) => r.post_id) ?? []);
}

export async function getFeedPosts(
  limit = 50,
  offset = 0
): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !posts) return [];

  return attachCommentCountsToPosts(supabase, posts);
}

export async function getPostById(id: number): Promise<PostWithAuthor | null> {
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !post) return null;

  const [enriched] = await attachCommentCountsToPosts(supabase, [post]);
  return enriched ?? null;
}

export async function getPopularPosts(limit = 50): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .order("likes_count", { ascending: false })
    .limit(limit);

  if (error || !posts) return [];

  return attachCommentCountsToPosts(supabase, posts);
}

export async function getHomeFeedBundle() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recentPosts, popularPosts, likedPostIds, bookmarkedPostIds, followingPosts, suggestedNpcs] =
    await Promise.all([
      getFeedPosts(50),
      getPopularPosts(),
      getUserLikedPostIds(),
      getUserBookmarkedPostIds(),
      user ? getPostsFromFollowing(50) : Promise.resolve([]),
      getSuggestedNpcs(3),
    ]);

  const postIds = [
    ...new Set([
      ...recentPosts.map((p) => p.id),
      ...popularPosts.map((p) => p.id),
      ...followingPosts.map((p) => p.id),
    ]),
  ];
  const commentsByPostId = await getCommentsByPostIds(postIds);

  return {
    recentPosts,
    popularPosts,
    followingPosts,
    suggestedNpcs,
    likedPostIds: [...likedPostIds],
    bookmarkedPostIds: [...bookmarkedPostIds],
    commentsByPostId,
  };
}

export async function getTrendingSnapshot(): Promise<TrendingSnapshot | null> {
  const supabase = await createClient();

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
  const supabase = await createClient();

  const [{ count: npcCount }, { count: humanCount }, { count: postsCount }] =
    await Promise.all([
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
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        ),
    ]);

  const total = (npcCount ?? 0) + (humanCount ?? 0);
  const humanPercent =
    total > 0
      ? ((humanCount ?? 0) / total * 100).toFixed(2)
      : "0.03";

  return {
    npcCount: npcCount ?? 0,
    humanCount: humanCount ?? 0,
    postsLast24h: postsCount ?? 0,
    humanPercent,
  };
}
