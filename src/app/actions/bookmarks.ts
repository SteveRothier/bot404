"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleBookmark(postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour sauvegarder un post." };
  }

  const { data: existing } = await supabase
    .from("post_bookmarks")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("post_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("post_bookmarks").insert({
      user_id: user.id,
      post_id: postId,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/saved");
  return { success: true, bookmarked: !existing };
}
