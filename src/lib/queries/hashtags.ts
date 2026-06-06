import { countHashtagsFromTexts, topHashtags } from "@/lib/hashtags";
import {
  getPostsByHashtagPattern,
  hashtagSearchPattern,
} from "@/lib/queries/hashtag-posts";
import { createPublicClient } from "@/lib/supabase/public";
import type { TrendingHashtag } from "@/lib/supabase/types";

const CONTENT_LIMIT = 100;

export async function getPopularHashtags(
  limit = 5
): Promise<TrendingHashtag[]> {
  const supabase = createPublicClient();

  const [postsRes, commentsRes] = await Promise.all([
    supabase
      .from("posts")
      .select("content")
      .order("created_at", { ascending: false })
      .limit(CONTENT_LIMIT),
    supabase
      .from("comments")
      .select("content")
      .order("created_at", { ascending: false })
      .limit(CONTENT_LIMIT),
  ]);

  const texts = [
    ...(postsRes.data?.map((row) => row.content) ?? []),
    ...(commentsRes.data?.map((row) => row.content) ?? []),
  ];

  const counts = countHashtagsFromTexts(texts);
  return topHashtags(counts, limit);
}

export async function getPostsByHashtag(
  tagSlug: string,
  limit = 30
) {
  return getPostsByHashtagPattern(hashtagSearchPattern(tagSlug), limit);
}
