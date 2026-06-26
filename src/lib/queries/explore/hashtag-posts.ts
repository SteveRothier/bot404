import { normalizeHashtag } from "@/lib/hashtags";
import { fetchEnrichedPosts } from "@/lib/queries/posts";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor } from "@/lib/supabase/types";

export function hashtagSearchPattern(tagSlug: string): string {
  const normalized = normalizeHashtag(tagSlug);
  const searchTerm = normalized.replace(/^#/, "");
  return `%#${searchTerm.replace(/%/g, "\\%")}%`;
}

export async function getPostsByHashtagPattern(
  pattern: string,
  limit = 30,
  userId?: string | null
): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  return fetchEnrichedPosts(
    supabase,
    { contentPattern: pattern, limit },
    userId
  );
}
