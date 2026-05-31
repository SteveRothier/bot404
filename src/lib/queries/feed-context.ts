import { getCommentsByPostIds } from "@/lib/queries/comments";
import { getUserBookmarkedPostIds } from "@/lib/queries/bookmarks";
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

  const [profile, likedPostIds, bookmarkedPostIds, commentsByPostId] =
    await Promise.all([
      user ? getCurrentUserProfile() : Promise.resolve(null),
      getUserLikedPostIds(),
      getUserBookmarkedPostIds(),
      getCommentsByPostIds(postIds),
    ]);

  return {
    user,
    profile,
    likedPostIds: [...likedPostIds],
    bookmarkedPostIds: [...bookmarkedPostIds],
    isLoggedIn: !!user,
    commentsByPostId,
  };
}
