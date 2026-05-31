import { attachCommentCountsToPosts } from "@/lib/queries/post-utils";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor, Profile } from "@/lib/supabase/types";

export async function getFollowingIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  return data?.map((row) => row.following_id) ?? [];
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  return !!data;
}

export async function getFollowerCount(profileId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profileId);

  return count ?? 0;
}

export async function getFollowingCount(profileId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profileId);

  return count ?? 0;
}

export async function getPostsFromFollowing(
  limit = 50,
  offset = 0
): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const followingIds = await getFollowingIds(user.id);
  if (followingIds.length === 0) return [];

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .in("author_id", followingIds)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !posts) return [];

  return attachCommentCountsToPosts(supabase, posts);
}

export async function getSuggestedNpcs(limit = 3): Promise<Profile[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true)
    .order("popularity_score", { ascending: false })
    .limit(limit);

  return (data as Profile[]) ?? [];
}
