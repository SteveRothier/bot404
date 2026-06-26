"use server";

import { revalidatePath } from "next/cache";
import { revalidateDataCaches } from "@/lib/queries/shell";
import { createClient } from "@/lib/supabase/server";

export async function votePoll(postId: number, optionId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour voter." };
  }

  const { error } = await supabase.rpc("apply_poll_vote_change", {
    p_post_id: postId,
    p_voter_id: user.id,
    p_new_option_id: optionId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  revalidateDataCaches();
  return { success: true };
}

export async function closePoll(postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour clôturer le sondage." };
  }

  const { data: post } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.author_id !== user.id) {
    return { error: "Action non autorisée." };
  }

  const { data: poll } = await supabase
    .from("post_polls")
    .select("ends_at")
    .eq("post_id", postId)
    .maybeSingle();

  if (!poll) {
    return { error: "Sondage introuvable." };
  }

  if (new Date(poll.ends_at).getTime() <= Date.now()) {
    return { error: "Ce sondage est déjà terminé." };
  }

  const { error } = await supabase
    .from("post_polls")
    .update({ ends_at: new Date().toISOString() })
    .eq("post_id", postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  revalidateDataCaches();
  return { success: true };
}
