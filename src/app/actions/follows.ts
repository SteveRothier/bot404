"use server";

import { revalidatePath } from "next/cache";
import { toggleMembership } from "@/lib/actions/toggle-membership";
import { createFollowNotification } from "@/lib/notifications";
import { requireAuthUser } from "@/lib/queries/auth";
import { createClient } from "@/lib/supabase/server";

export async function toggleFollow(followingId: string) {
  const auth = await requireAuthUser("Connectez-vous pour suivre un profil.");
  if ("error" in auth) return auth;

  if (auth.user.id === followingId) {
    return { error: "Vous ne pouvez pas vous suivre vous-même." };
  }

  const supabase = await createClient();
  const result = await toggleMembership(
    supabase,
    "follows",
    { follower_id: auth.user.id, following_id: followingId },
    { follower_id: auth.user.id, following_id: followingId }
  );

  if ("error" in result) return result;

  if (result.active) {
    await createFollowNotification(auth.user.id, followingId);
  }

  revalidatePath("/");
  revalidatePath("/profile/[username]", "page");
  return { success: true, following: result.active };
}
