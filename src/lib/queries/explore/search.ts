import { fetchEnrichedPosts } from "@/lib/queries/posts";
import { getPostsByHashtagPattern, hashtagSearchPattern } from "@/lib/queries/explore";
import { searchProfilesByUsernamePattern } from "@/lib/queries/explore";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isHashtag = q.startsWith("#");
  const searchTerm = isHashtag ? q.slice(1) : q;
  const pattern = `%${searchTerm.replace(/%/g, "\\%")}%`;

  const [profiles, posts] = await Promise.all([
    isHashtag
      ? Promise.resolve([] as Profile[])
      : searchProfilesByUsernamePattern(q, { limit: 10, fields: "full" }),
    isHashtag
      ? getPostsByHashtagPattern(hashtagSearchPattern(searchTerm), 20, user?.id)
      : fetchEnrichedPosts(
          supabase,
          { contentPattern: pattern, limit: 20 },
          user?.id
        ),
  ]);

  return { profiles, posts };
}
