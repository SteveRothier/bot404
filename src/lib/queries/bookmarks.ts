import { attachCommentCountsToPosts } from "@/lib/queries/post-utils";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor } from "@/lib/supabase/types";

export async function getUserBookmarkedPostIds(): Promise<Set<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Set();

  const { data } = await supabase
    .from("post_bookmarks")
    .select("post_id")
    .eq("user_id", user.id);

  return new Set(data?.map((row) => row.post_id) ?? []);
}

export async function getBookmarkedPosts(): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: bookmarks } = await supabase
    .from("post_bookmarks")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!bookmarks?.length) return [];

  const postIds = bookmarks.map((row) => row.post_id);
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .in("id", postIds);

  if (error || !posts) return [];

  const order = new Map(postIds.map((id, index) => [id, index]));
  const sorted = [...posts].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );

  return attachCommentCountsToPosts(supabase, sorted);
}
