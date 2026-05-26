import { createClient } from "@/lib/supabase/server";
import type {
  NetworkStats,
  PostWithAuthor,
  Profile,
  TrendingData,
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

export async function getFeedPosts(limit = 50): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !posts) return [];

  const postIds = posts.map((p) => p.id);
  const { data: commentCounts } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds);

  const countMap = new Map<number, number>();
  commentCounts?.forEach((c) => {
    countMap.set(c.post_id, (countMap.get(c.post_id) ?? 0) + 1);
  });

  return posts.map((post) => ({
    ...post,
    author: post.author as Profile,
    comment_count: countMap.get(post.id) ?? 0,
  })) as PostWithAuthor[];
}

export async function getPopularPosts(limit = 50): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .order("likes_count", { ascending: false })
    .limit(limit);

  if (error || !posts) return [];

  return posts.map((post) => ({
    ...post,
    author: post.author as Profile,
    comment_count: 0,
  })) as PostWithAuthor[];
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

export async function getOnlineNpcs(limit = 5): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true)
    .order("popularity_score", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Profile[];
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
    postsLast24h: postsCount ?? 0,
    humanPercent,
  };
}

export function deriveHashtagsFromPosts(
  posts: PostWithAuthor[]
): TrendingData["hashtags"] {
  const counts = new Map<string, number>();
  const regex = /#[\w\u00C0-\u024F]+/gi;

  for (const post of posts) {
    const matches = post.content.match(regex);
    matches?.forEach((tag) => {
      const normalized = tag.toLowerCase();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count: count * 1000 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
