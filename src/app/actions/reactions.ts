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
import type { PostType } from "@/lib/supabase/types";

async function mirrorNpcReactionsOnRelay(postId: number) {
  if (Math.random() > 0.6) return;

  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select("author_id, post_type, content")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return;

  await maybeNpcReactionsOnPost(postId, {
    humanAuthorId: post.author_id,
    postType: (post.post_type ?? "message") as PostType,
    postContent: post.content,
    minCount: 1,
    maxCount: 2,
  });
}

async function applyNarrativeReactionEffects(postId: number, userId: string) {
  await createReactionNotification(postId, userId);
  await enqueueReactionSignal(userId, postId, "relay");
  await mirrorNpcReactionsOnRelay(postId);
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
      .update({ kind: "relay" })
      .eq("user_id", user.id)
      .eq("post_id", postId);
    if (error) return { error: error.message };
    await applyNarrativeReactionEffects(postId, user.id);
  } else {
    const { error } = await supabase.from("post_reactions").insert({
      user_id: user.id,
      post_id: postId,
      kind: "relay",
    });
    if (error) return { error: error.message };

    await applyNarrativeReactionEffects(postId, user.id);
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  revalidateDataCaches();
  return { success: true, kind: "relay" };
}
