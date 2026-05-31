import { attachCommentCountsToPosts } from "@/lib/queries/post-utils";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor, Profile } from "@/lib/supabase/types";

export type SearchResults = {
  profiles: Profile[];
  posts: PostWithAuthor[];
};

export async function searchNetwork(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q || q.length < 2) {
    return { profiles: [], posts: [] };
  }

  const supabase = await createClient();
  const isHashtag = q.startsWith("#");
  const searchTerm = isHashtag ? q.slice(1) : q;
  const pattern = `%${searchTerm.replace(/%/g, "\\%")}%`;

  const [profilesRes, postsRes] = await Promise.all([
    isHashtag
      ? Promise.resolve({ data: [] as Profile[], error: null })
      : supabase
          .from("profiles")
          .select("*")
          .ilike("username", pattern)
          .order("popularity_score", { ascending: false })
          .limit(10),
    supabase
      .from("posts")
      .select("*, author:profiles!author_id(*)")
      .ilike("content", isHashtag ? `%#${searchTerm}%` : pattern)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const posts = postsRes.data ?? [];
  const enrichedPosts = await attachCommentCountsToPosts(supabase, posts);

  return {
    profiles: (profilesRes.data as Profile[]) ?? [],
    posts: enrichedPosts,
  };
}
