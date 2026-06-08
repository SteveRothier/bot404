"use server";

import { revalidatePath } from "next/cache";
import { persistAvatarUrlIfRemote } from "@/lib/avatar-storage";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const bio = ((formData.get("bio") as string) ?? "").trim();
  const avatarUrl = ((formData.get("avatar_url") as string) ?? "").trim();

  if (bio.length > 160) {
    return { error: "La bio ne peut pas dépasser 160 caractères." };
  }

  if (avatarUrl && !/^https?:\/\/.+/i.test(avatarUrl)) {
    return { error: "URL d'avatar invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour modifier votre profil." };
  }

  const persisted = await persistAvatarUrlIfRemote(user.id, avatarUrl || null);
  if ("error" in persisted) {
    return { error: persisted.error };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      bio: bio || null,
      avatar_url: persisted.url,
    })
    .eq("id", user.id)
    .eq("is_npc", false)
    .select("username")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!profile) {
    return { error: "Profil introuvable." };
  }

  revalidatePath(`/profile/${profile.username}`);
  revalidatePath("/profile/edit");
  return { success: true };
}
