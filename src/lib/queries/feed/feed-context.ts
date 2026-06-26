import { getCommentsByPostIds } from "@/lib/queries/posts";
import { getUserBookmarkedPostIdsForPosts } from "@/lib/queries/social";
import { getUserReactionsByPostIds } from "@/lib/queries/social";
import { getRequestAuth, type RequestAuth } from "@/lib/queries/shell";
import type { CommentWithAuthor, Profile, ReactionKind } from "@/lib/supabase/types";

export type PostInteractions = {
  bookmarkedPostIds: number[];
  commentsByPostId: Record<number, CommentWithAuthor[]>;
  userReactionsByPostId: Record<number, ReactionKind>;
};

export type FeedInteractionContext = PostInteractions & {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  isLoggedIn: boolean;
};

export async function resolvePostInteractions(
  postIds: number[],
  userId?: string
): Promise<PostInteractions> {
  const [bookmarkedPostIds, commentsByPostId, userReactionsByPostId] =
    await Promise.all([
      userId
        ? getUserBookmarkedPostIdsForPosts(userId, postIds)
        : Promise.resolve(new Set<number>()),
      getCommentsByPostIds(postIds),
      userId
        ? getUserReactionsByPostIds(postIds, userId)
        : Promise.resolve({} as Record<number, ReactionKind>),
    ]);

  return {
    bookmarkedPostIds: [...bookmarkedPostIds],
    commentsByPostId,
    userReactionsByPostId,
  };
}

export async function getFeedInteractionContext(
  postIds: number[],
  auth?: RequestAuth
): Promise<FeedInteractionContext> {
  const resolved = auth ?? (await getRequestAuth());
  const interactions = await resolvePostInteractions(
    postIds,
    resolved.user?.id
  );

  return {
    user: resolved.user,
    profile: resolved.profile,
    isLoggedIn: !!resolved.user,
    ...interactions,
  };
}
