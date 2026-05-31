"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleFollow(followingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour suivre un profil." };
  }

  if (user.id === followingId) {
    return { error: "Vous ne pouvez pas vous suivre vous-même." };
  }

  const { data: existing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .eq("following_id", followingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: followingId,
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/profile/[username]", "page");
  return { success: true, following: !existing };
}
