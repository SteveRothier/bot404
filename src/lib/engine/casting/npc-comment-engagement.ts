import { pickNpcsForReactions } from "@/lib/engine/casting/reaction-cast";
import { loadAllNpcs } from "@/lib/engine/casting/select-npc";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType } from "@/lib/supabase/types";

type CommentEngagementTarget = {
  id: number;
  author_id: string;
  content: string;
  relay_count: number;
  post_id: number;
  post_type: PostType;
  post_author_id: string;
  post_content: string;
};

export type NpcCommentLikeOptions = {
  minLikes?: number;
  maxLikes?: number;
  excludeNpcIds?: Set<string>;
  /** Favorise les likes sur ce commentaire (ex. commentaire humain récent). */
  prioritizeCommentId?: number;
};

export function pickWeightedComment<T extends { relay_count: number; id: number }>(
  comments: T[],
  prioritizeId?: number,
  random = Math.random
): T | null {
  if (!comments.length) return null;

  const pool = prioritizeId
    ? [
        ...comments.filter((c) => c.id === prioritizeId),
        ...comments.filter((c) => c.id !== prioritizeId),
      ]
    : comments;

  const weights = pool.map((c, index) => {
    const base = 1 / (1 + (c.relay_count ?? 0));
    return index === 0 && prioritizeId ? base + 1.5 : base;
  });

  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = random() * total;

  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }

  return pool[pool.length - 1];
}

async function fetchCommentsForEngagement(
  postId: number
): Promise<CommentEngagementTarget[]> {
  const supabase = createAdminClient();

  const { data: post } = await supabase
    .from("posts")
    .select("author_id, post_type, content")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return [];

  const { data: comments } = await supabase
    .from("comments")
    .select("id, author_id, content, relay_count")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(24);

  return (comments ?? []).map((comment) => ({
    id: comment.id,
    author_id: comment.author_id,
    content: comment.content,
    relay_count: comment.relay_count ?? 0,
    post_id: postId,
    post_type: (post.post_type ?? "message") as PostType,
    post_author_id: post.author_id,
    post_content: post.content,
  }));
}

async function fetchPostsWithCommentsForAmbient(
  limit = 25
): Promise<CommentEngagementTarget[]> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: comments } = await supabase
    .from("comments")
    .select(
      "id, author_id, content, relay_count, post_id, created_at, post:posts!post_id(author_id, post_type, content, created_at)"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (!comments?.length) return [];

  const targets: CommentEngagementTarget[] = [];

  for (const row of comments) {
    const post = row.post as {
      author_id?: string;
      post_type?: string;
      content?: string;
      created_at?: string;
    } | null;
    if (!post?.author_id || !post.content) continue;

    targets.push({
      id: row.id,
      author_id: row.author_id,
      content: row.content,
      relay_count: row.relay_count ?? 0,
      post_id: row.post_id,
      post_type: (post.post_type ?? "message") as PostType,
      post_author_id: post.author_id,
      post_content: post.content,
    });
  }

  return targets;
}

/** NPC « j'aime » sur des commentaires d'un fil. */
export async function maybeNpcLikesOnPostComments(
  postId: number,
  options: NpcCommentLikeOptions = {}
): Promise<number> {
  const min = options.minLikes ?? 1;
  const max = options.maxLikes ?? 4;
  const targetCount = min + Math.floor(Math.random() * (max - min + 1));

  const comments = await fetchCommentsForEngagement(postId);
  if (!comments.length) return 0;

  const supabase = createAdminClient();
  const npcs = await loadAllNpcs();
  if (!npcs.length) return 0;

  let inserted = 0;
  const usedPairs = new Set<string>();

  for (let attempt = 0; attempt < targetCount * 3 && inserted < targetCount; attempt++) {
    const comment = pickWeightedComment(
      comments,
      options.prioritizeCommentId
    );
    if (!comment) break;

    const { data: existingLikes } = await supabase
      .from("comment_likes")
      .select("user_id")
      .eq("comment_id", comment.id);

    const excludeNpcIds = new Set(options.excludeNpcIds ?? []);
    excludeNpcIds.add(comment.author_id);
    for (const like of existingLikes ?? []) {
      excludeNpcIds.add(like.user_id);
    }

    const picked = pickNpcsForReactions(npcs, {
      content: comment.content,
      postType: comment.post_type,
      humanAuthorId: comment.author_id,
      count: 1,
      excludeNpcIds,
    });

    const npc = picked[0];
    if (!npc) continue;

    const pairKey = `${npc.id}:${comment.id}`;
    if (usedPairs.has(pairKey)) continue;

    const { error } = await supabase.from("comment_likes").insert({
      user_id: npc.id,
      comment_id: comment.id,
    });

    if (!error) {
      inserted += 1;
      usedPairs.add(pairKey);
    }
  }

  return inserted;
}

/** Likes ambient sur des commentaires récents (plusieurs fils). */
export async function maybeAmbientNpcCommentLikes(
  batchSize = 2
): Promise<number> {
  const targets = await fetchPostsWithCommentsForAmbient();
  if (!targets.length) return 0;

  let total = 0;
  const usedPosts = new Set<number>();

  for (let i = 0; i < batchSize; i++) {
    const pool = targets.filter((t) => !usedPosts.has(t.post_id));
    if (!pool.length) break;

    const pick = pickWeightedComment(pool);
    if (!pick) break;

    usedPosts.add(pick.post_id);
    total += await maybeNpcLikesOnPostComments(pick.post_id, {
      minLikes: 1,
      maxLikes: 3,
      prioritizeCommentId: pick.id,
    });
  }

  return total;
}
