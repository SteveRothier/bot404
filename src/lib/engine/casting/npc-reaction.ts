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

export async function maybeNpcReactionsOnPost(
  postId: number,
  options: NpcReactionOptions
): Promise<number> {
  const min = options.minCount ?? 1;
  const max = options.maxCount ?? 2;
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

export async function maybeAmbientNpcReactionsOnHumanPost(): Promise<void> {
  if (Math.random() >= 0.5) return;

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, author_id, post_type, content, author:profiles!author_id(is_npc)")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  const humanPosts =
    posts?.filter((p) => {
      const author = p.author as { is_npc?: boolean } | null;
      return author?.is_npc === false;
    }) ?? [];

  if (!humanPosts.length) return;

  const pick = humanPosts[Math.floor(Math.random() * humanPosts.length)];
  await maybeNpcReactionsOnPost(pick.id, {
    humanAuthorId: pick.author_id,
    postType: (pick.post_type ?? "message") as PostType,
    postContent: pick.content,
  });
}
