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
  const pattern = `%${q.replace(/%/g, "\\%")}%`;

  const [profilesRes, postsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .ilike("username", pattern)
      .order("popularity_score", { ascending: false })
      .limit(10),
    supabase
      .from("posts")
      .select("*, author:profiles!author_id(*)")
      .ilike("content", pattern)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    profiles: (profilesRes.data as Profile[]) ?? [],
    posts:
      postsRes.data?.map((p) => ({
        ...p,
        author: p.author as Profile,
        comment_count: 0,
      })) ?? [],
  };
}
