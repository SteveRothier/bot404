"use server";

import { revalidatePath } from "next/cache";
import { toggleMembership } from "@/lib/actions/toggle-membership";
import { maybeNpcLikesOnPostComments } from "@/lib/engine/casting/npc-comment-engagement";
import { createCommentLikeNotification } from "@/lib/notifications";
import { requireAuthUser } from "@/lib/queries/shell";
import { createClient } from "@/lib/supabase/server";

export async function toggleCommentLike(commentId: number, postId: number) {
  const auth = await requireAuthUser("Connectez-vous pour réagir.");
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const result = await toggleMembership(
    supabase,
    "comment_likes",
    { user_id: auth.user.id, comment_id: commentId },
    { user_id: auth.user.id, comment_id: commentId }
  );

  if ("error" in result) return result;

  if (result.active) {
    await createCommentLikeNotification(commentId, auth.user.id);
    if (Math.random() < 0.55) {
      await maybeNpcLikesOnPostComments(postId, {
        minLikes: 1,
        maxLikes: 2,
        prioritizeCommentId: commentId,
      });
    }
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { success: true, liked: result.active };
}

export async function toggleCommentBookmark(commentId: number, postId: number) {
  const auth = await requireAuthUser("Connectez-vous pour sauvegarder.");
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const result = await toggleMembership(
    supabase,
    "comment_bookmarks",
    { user_id: auth.user.id, comment_id: commentId },
    { user_id: auth.user.id, comment_id: commentId }
  );

  if ("error" in result) return result;

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { success: true, bookmarked: result.active };
}
