import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostWithAuthor, Profile } from "@/lib/supabase/types";

export async function attachCommentCountsToPosts(
  supabase: SupabaseClient,
  posts: Array<{ id: number; author: unknown; [key: string]: unknown }>
): Promise<PostWithAuthor[]> {
  if (posts.length === 0) return [];

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
