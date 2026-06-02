"use server";

import { revalidatePath } from "next/cache";
import { processReactionFactionEffects } from "@/lib/factions/simulation";
import { createReactionNotification } from "@/lib/notifications";
import { isReactionKind } from "@/lib/reactions";
import { maybePromoteRumorToEvent } from "@/lib/rumor-events";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ReactionKind } from "@/lib/supabase/types";

export async function toggleReaction(postId: number, kind: string) {
  if (!isReactionKind(kind)) {
    return { error: "Réaction invalide." };
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour réagir." };
  }

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
    await processReactionFactionEffects(
      admin,
      postId,
      kind as ReactionKind,
      -1
    );
    revalidatePath("/");
    return { success: true, kind: null };
  }

  if (existing) {
    const oldKind = existing.kind as ReactionKind;
    const { error } = await supabase
      .from("post_reactions")
      .update({ kind })
      .eq("user_id", user.id)
      .eq("post_id", postId);
    if (error) return { error: error.message };
    await processReactionFactionEffects(admin, postId, oldKind, -1);
    await processReactionFactionEffects(admin, postId, kind as ReactionKind, 1);
  } else {
    const { error } = await supabase.from("post_reactions").insert({
      user_id: user.id,
      post_id: postId,
      kind,
    });
    if (error) return { error: error.message };
    await processReactionFactionEffects(admin, postId, kind as ReactionKind, 1);

    if (kind === "relay" || kind === "amplify") {
      await createReactionNotification(postId, user.id, kind);
      await maybePromoteRumorToEvent(postId);
    }
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { success: true, kind };
}
