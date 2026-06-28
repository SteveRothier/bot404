import {
  pickNpcsForReactions,
  pickReactionKindForNpc,
} from "@/lib/engine/casting/reaction-cast";
import { loadAllNpcs } from "@/lib/engine/casting/select-npc";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType, ReactionKind } from "@/lib/supabase/types";

export type NpcReactionOptions = {
  humanAuthorId: string;
  postType: PostType;
  postContent?: string;
  minCount?: number;
  maxCount?: number;
};

export { pickReactionKindForNpc } from "@/lib/engine/casting/reaction-cast";

type PostReactionTarget = {
  id: number;
  author_id: string;
  post_type: PostType;
  content: string;
  reactionScore: number;
};

async function fetchPostsForAmbientReactions(
  limit = 25
): Promise<PostReactionTarget[]> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, author_id, post_type, content, relay_count, created_at"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!posts?.length) return [];

  return posts.map((p) => ({
    id: p.id,
    author_id: p.author_id,
    post_type: (p.post_type ?? "message") as PostType,
    content: p.content,
    reactionScore: p.relay_count ?? 0,
  }));
}

function pickWeightedPost(
  posts: PostReactionTarget[],
  random = Math.random
): PostReactionTarget | null {
  if (!posts.length) return null;

  const weights = posts.map((p) => 1 / (1 + p.reactionScore));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = random() * total;

  for (let i = 0; i < posts.length; i++) {
    r -= weights[i];
    if (r <= 0) return posts[i];
  }
  return posts[posts.length - 1];
}

export async function maybeNpcReactionsOnPost(
  postId: number,
  options: NpcReactionOptions
): Promise<number> {
  const min = options.minCount ?? 2;
  const max = options.maxCount ?? 5;
  const count = min + Math.floor(Math.random() * (max - min + 1));

  const supabase = createAdminClient();
  let postContent = options.postContent ?? "";

  if (!postContent) {
    const { data: post } = await supabase
      .from("posts")
      .select("content")
      .eq("id", postId)
      .maybeSingle();
    postContent = post?.content ?? "";
  }

  const { data: existingReactions } = await supabase
    .from("post_reactions")
    .select("user_id")
    .eq("post_id", postId);

  const excludeNpcIds = new Set(
    (existingReactions ?? []).map((r) => r.user_id)
  );

  const npcs = await loadAllNpcs();
  const picked = pickNpcsForReactions(npcs, {
    content: postContent,
    postType: options.postType,
    humanAuthorId: options.humanAuthorId,
    count,
    excludeNpcIds,
  });

  if (!picked.length) return 0;

  let inserted = 0;

  for (const npc of picked) {
    const kind = pickReactionKindForNpc(
      npc,
      options.postType,
      postContent
    );

    const { data: existing } = await supabase
      .from("post_reactions")
      .select("kind")
      .eq("user_id", npc.id)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from("post_reactions").insert({
      user_id: npc.id,
      post_id: postId,
      kind,
    });

    if (!error) inserted += 1;
  }

  return inserted;
}

/** Réactions ambient sur plusieurs posts récents (humains et NPC). */
export async function maybeAmbientNpcReactions(
  batchSize = 2
): Promise<number> {
  const posts = await fetchPostsForAmbientReactions();
  if (!posts.length) return 0;

  let total = 0;
  const used = new Set<number>();

  for (let i = 0; i < batchSize; i++) {
    const pool = posts.filter((p) => !used.has(p.id));
    if (!pool.length) break;

    const pick = pickWeightedPost(pool);
    if (!pick) break;

    used.add(pick.id);
    total += await maybeNpcReactionsOnPost(pick.id, {
      humanAuthorId: pick.author_id,
      postType: pick.post_type,
      postContent: pick.content,
    });
  }

  return total;
}

/** @deprecated Utiliser maybeAmbientNpcReactions */
export async function maybeAmbientNpcReactionsOnHumanPost(): Promise<void> {
  await maybeAmbientNpcReactions(1);
}
