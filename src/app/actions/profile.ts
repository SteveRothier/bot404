"use server";

import { revalidatePath } from "next/cache";
import {
  persistAvatarFile,
  persistAvatarUrlIfRemote,
} from "@/lib/avatar-storage";
import { requireAuthUser } from "@/lib/queries/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const bio = ((formData.get("bio") as string) ?? "").trim();
  const avatarUrl = ((formData.get("avatar_url") as string) ?? "").trim();
  const avatarFile = formData.get("avatar_file");
  const clearAvatar = formData.get("clear_avatar") === "1";

  if (bio.length > 160) {
    return { error: "La bio ne peut pas dépasser 160 caractères." };
  }

  if (avatarUrl && !/^https?:\/\/.+/i.test(avatarUrl)) {
    return { error: "URL d'avatar invalide." };
  }

  const auth = await requireAuthUser("Connectez-vous pour modifier votre profil.");
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { user } = auth;

  let avatar_url: string | null;

  if (clearAvatar) {
    avatar_url = null;
  } else if (avatarFile instanceof File && avatarFile.size > 0) {
    const uploaded = await persistAvatarFile(user.id, avatarFile);
    if ("error" in uploaded) {
      return { error: uploaded.error };
    }
    avatar_url = uploaded.url;
  } else {
    const persisted = await persistAvatarUrlIfRemote(user.id, avatarUrl || null);
    if ("error" in persisted) {
      return { error: persisted.error };
    }
    avatar_url = persisted.url;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      bio: bio || null,
      avatar_url,
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
