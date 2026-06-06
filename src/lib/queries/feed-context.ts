import { getCommentsByPostIds } from "@/lib/queries/comments";
import { getUserBookmarkedPostIdsForPosts } from "@/lib/queries/bookmarks";
import { getUserLikedPostIdsForPosts } from "@/lib/queries/feed";
import { getUserReactionsByPostIds } from "@/lib/queries/reactions";
import { getRequestAuth, type RequestAuth } from "@/lib/queries/auth";
import type { CommentWithAuthor, Profile, ReactionKind } from "@/lib/supabase/types";

export type FeedInteractionContext = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  likedPostIds: number[];
  bookmarkedPostIds: number[];
  isLoggedIn: boolean;
  commentsByPostId: Record<number, CommentWithAuthor[]>;
  userReactionsByPostId: Record<number, ReactionKind>;
};

export async function getFeedInteractionContext(
  postIds: number[],
  auth?: RequestAuth
): Promise<FeedInteractionContext> {
  const resolved = auth ?? (await getRequestAuth());
  const userId = resolved.user?.id;

  const [
    likedPostIds,
    bookmarkedPostIds,
    commentsByPostId,
    userReactionsByPostId,
  ] = await Promise.all([
    userId
      ? getUserLikedPostIdsForPosts(userId, postIds)
      : Promise.resolve(new Set<number>()),
    userId
      ? getUserBookmarkedPostIdsForPosts(userId, postIds)
      : Promise.resolve(new Set<number>()),
    getCommentsByPostIds(postIds),
    userId
      ? getUserReactionsByPostIds(postIds, userId)
      : Promise.resolve({} as Record<number, ReactionKind>),
  ]);

  return {
    user: resolved.user,
    profile: resolved.profile,
    likedPostIds: [...likedPostIds],
    bookmarkedPostIds: [...bookmarkedPostIds],
    isLoggedIn: !!resolved.user,
    commentsByPostId,
    userReactionsByPostId,
  };
}
