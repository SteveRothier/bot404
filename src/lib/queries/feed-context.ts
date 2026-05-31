import { getCommentsByPostIds } from "@/lib/queries/comments";
import {
  getCurrentUserProfile,
  getUserLikedPostIds,
} from "@/lib/queries/feed";
import { createClient } from "@/lib/supabase/server";

export async function getFeedInteractionContext(postIds: number[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, likedPostIds, commentsByPostId] = await Promise.all([
    user ? getCurrentUserProfile() : Promise.resolve(null),
    getUserLikedPostIds(),
    getCommentsByPostIds(postIds),
  ]);

  return {
    user,
    profile,
    likedPostIds: [...likedPostIds],
    isLoggedIn: !!user,
    commentsByPostId,
  };
}
