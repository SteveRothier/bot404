import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PostPoll,
  PostPollOption,
  PostType,
  PostWithAuthor,
  Profile,
} from "@/lib/supabase/types";

export const POST_WITH_AUTHOR =
  "*, author:profiles!author_id(*)";

export const POST_WITH_AUTHOR_BASIC =
  "*, author:profiles!author_id(*)";

export type FetchEnrichedPostsOptions = {
  limit?: number;
  offset?: number;
  postType?: PostType;
  authorId?: string;
  authorIds?: string[];
  contentPattern?: string;
  postIds?: number[];
  select?: string;
};

export async function fetchEnrichedPosts(
  supabase: SupabaseClient,
  options: FetchEnrichedPostsOptions = {},
  userId?: string | null
): Promise<PostWithAuthor[]> {
  const {
    limit = 50,
    offset = 0,
    postType,
    authorId,
    authorIds,
    contentPattern,
    postIds,
    select = POST_WITH_AUTHOR,
  } = options;

  if (postIds?.length === 0) return [];

  let query = supabase
    .from("posts")
    .select(select)
    .order("created_at", { ascending: false });

  if (postIds?.length) {
    query = query.in("id", postIds);
  } else {
    if (authorId) query = query.eq("author_id", authorId);
    if (authorIds?.length) query = query.in("author_id", authorIds);
    if (postType) query = query.eq("post_type", postType);
    if (contentPattern) query = query.ilike("content", contentPattern);
    query = query.range(offset, offset + limit - 1);
  }

  const { data: posts, error } = await query;
  if (error || !posts) return [];

  return attachCommentCountsToPosts(
    supabase,
    posts as unknown as Array<{ id: number; author: unknown; [key: string]: unknown }>,
    userId
  );
}

export async function attachPollsToPosts(
  supabase: SupabaseClient,
  posts: PostWithAuthor[],
  userId?: string | null
): Promise<PostWithAuthor[]> {
  if (posts.length === 0) return posts;

  const postIds = posts.map((p) => p.id);
  const { data: pollRows } = await supabase
    .from("post_polls")
    .select("post_id, ends_at")
    .in("post_id", postIds);

  if (!pollRows?.length) {
    return posts.map((p) => ({ ...p, poll: null }));
  }

  const pollPostIds = pollRows.map((r) => r.post_id);
  const { data: optionRows } = await supabase
    .from("post_poll_options")
    .select("id, post_id, position, label, votes_count")
    .in("post_id", pollPostIds)
    .order("position", { ascending: true });

  let voteMap = new Map<number, number>();
  if (userId) {
    const { data: votes } = await supabase
      .from("post_poll_votes")
      .select("post_id, option_id")
      .eq("voter_id", userId)
      .in("post_id", pollPostIds);
    voteMap = new Map(
      votes?.map((v) => [Number(v.post_id), Number(v.option_id)]) ?? []
    );
  }

  const optionsByPost = new Map<number, PostPollOption[]>();
  optionRows?.forEach((o) => {
    const postId = Number(o.post_id);
    const list = optionsByPost.get(postId) ?? [];
    list.push(o as PostPollOption);
    optionsByPost.set(postId, list);
  });

  const pollByPost = new Map<number, PostPoll>();
  pollRows.forEach((row) => {
    const postId = Number(row.post_id);
    pollByPost.set(postId, {
      post_id: postId,
      ends_at: row.ends_at,
      options: optionsByPost.get(postId) ?? [],
      user_vote_option_id: voteMap.get(postId) ?? null,
    });
  });

  return posts.map((post) => ({
    ...post,
    poll: pollByPost.get(Number(post.id)) ?? null,
  }));
}

export async function attachCommentCountsToPosts(
  supabase: SupabaseClient,
  posts: Array<{ id: number; author: unknown; [key: string]: unknown }>,
  userId?: string | null
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

  const withCounts = posts.map((post) => ({
    ...post,
    author: post.author as Profile,
    comment_count: countMap.get(post.id) ?? 0,
  })) as PostWithAuthor[];

  return attachPollsToPosts(supabase, withCounts, userId);
}
