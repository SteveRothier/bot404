"use server";

import { revalidatePath } from "next/cache";
import { toggleMembership } from "@/lib/actions/toggle-membership";
import { requireAuthUser } from "@/lib/queries/auth";
import { createClient } from "@/lib/supabase/server";

export async function toggleBookmark(postId: number) {
  const auth = await requireAuthUser("Connectez-vous pour sauvegarder un post.");
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const result = await toggleMembership(
    supabase,
    "post_bookmarks",
    { user_id: auth.user.id, post_id: postId },
    { user_id: auth.user.id, post_id: postId }
  );

  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath("/saved");
  return { success: true, bookmarked: result.active };
}
