"use server";

import { revalidatePath } from "next/cache";
import { revalidateDataCaches } from "@/lib/queries/shell";
import { enqueueReactionSignal } from "@/lib/engine/reactive/signals";
import { triggerNarrativeTickAfterAction } from "@/lib/engine/reactive/trigger-tick";
import { createReactionNotification } from "@/lib/notifications";
import { maybeNpcReactionsOnPost } from "@/lib/engine/casting/npc-reaction";
import { isReactionKind } from "@/lib/reactions";
import { requireAuthUser } from "@/lib/queries/shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PostType, ReactionKind } from "@/lib/supabase/types";

async function mirrorNpcReactionsOnRelay(postId: number) {
  if (Math.random() > 0.6) return;

  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select("author_id, post_type, content, author:profiles!author_id(is_npc)")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return;

  const authorRaw = post.author;
  const author = (
    Array.isArray(authorRaw) ? authorRaw[0] : authorRaw
  ) as { is_npc?: boolean } | null;

  if (author?.is_npc) return;

  await maybeNpcReactionsOnPost(postId, {
    humanAuthorId: post.author_id,
    postType: (post.post_type ?? "message") as PostType,
    postContent: post.content,
    minCount: 1,
    maxCount: 2,
  });
}

async function applyNarrativeReactionEffects(
  postId: number,
  userId: string,
  kind: ReactionKind
) {
  if (kind === "relay") {
    await createReactionNotification(postId, userId, "relay");
    await enqueueReactionSignal(userId, postId, kind);
    await mirrorNpcReactionsOnRelay(postId);
    triggerNarrativeTickAfterAction();
    return;
  }

  if (kind === "amplify") {
    await createReactionNotification(postId, userId, "amplify");
  }

  await enqueueReactionSignal(userId, postId, kind);
  triggerNarrativeTickAfterAction();
}

export async function toggleReaction(postId: number, kind: string) {
  if (!isReactionKind(kind)) {
    return { error: "Réaction invalide." };
  }

  const auth = await requireAuthUser("Connectez-vous pour réagir.");
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { user } = auth;
  const reactionKind = kind as ReactionKind;

  const { data: existing } = await supabase
    .from("post_reactions")
    .select("kind")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing?.kind === kind) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);
    if (error) return { error: error.message };
    revalidatePath("/");
    revalidateDataCaches();
    return { success: true, kind: null };
  }

  if (existing) {
    const { error } = await supabase
      .from("post_reactions")
      .update({ kind })
      .eq("user_id", user.id)
      .eq("post_id", postId);
    if (error) return { error: error.message };
    await applyNarrativeReactionEffects(postId, user.id, reactionKind);
  } else {
    const { error } = await supabase.from("post_reactions").insert({
      user_id: user.id,
      post_id: postId,
      kind,
    });
    if (error) return { error: error.message };

    await applyNarrativeReactionEffects(postId, user.id, reactionKind);
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  revalidateDataCaches();
  return { success: true, kind };
}
