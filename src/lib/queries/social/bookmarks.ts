import {
  fetchEnrichedPosts,
  POST_WITH_AUTHOR_BASIC,
} from "@/lib/queries/posts";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor } from "@/lib/supabase/types";

export async function getUserBookmarkedPostIdsForPosts(
  userId: string,
  postIds: number[]
): Promise<Set<number>> {
  if (postIds.length === 0) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("post_bookmarks")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  return new Set(data?.map((row) => row.post_id) ?? []);
}

export async function getBookmarkedPosts(userId?: string): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const id =
    userId ??
    (
      await supabase.auth.getUser()
    ).data.user?.id;

  if (!id) return [];

  const { data: bookmarks } = await supabase
    .from("post_bookmarks")
    .select("post_id, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  if (!bookmarks?.length) return [];

  const postIds = bookmarks.map((row) => row.post_id);
  const posts = await fetchEnrichedPosts(
    supabase,
    { postIds, select: POST_WITH_AUTHOR_BASIC },
    id
  );

  const order = new Map(postIds.map((postId, index) => [postId, index]));
  return [...posts].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );
}
