import {
  getPostsByHashtagPattern,
  hashtagSearchPattern,
} from "@/lib/queries/explore/hashtag-posts";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { TrendingHashtag } from "@/lib/supabase/types";
import { countHashtagsFromTexts, topHashtags } from "@/lib/hashtags";

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

export async function getPostsByHashtag(tagSlug: string, limit = 30) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return getPostsByHashtagPattern(
    hashtagSearchPattern(tagSlug),
    limit,
    user?.id
  );
}
