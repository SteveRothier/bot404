import { notFound } from "next/navigation";
import { FeedList } from "@/components/feed/FeedList";
import { PostCard } from "@/components/feed/PostCard";
import { EmergentPostBanner } from "@/components/feed/EmergentPostBanner";
import { getPostById } from "@/lib/queries/feed";
import { getFeedInteractionContext } from "@/lib/queries/feed";
import { getEmergentPostContext } from "@/lib/queries/posts/emergent-context";
import type { RequestAuth } from "@/lib/queries/shell";
import type { PostWithAuthor } from "@/lib/supabase/types";

type FeedListProps = {
  posts: PostWithAuthor[];
  referenceNowMs?: number;
  emptyMessage?: string;
  defaultCommentsOpen?: boolean;
  auth?: RequestAuth;
};

export async function FeedListLoader({
  posts,
  referenceNowMs = Date.now(),
  emptyMessage,
  defaultCommentsOpen,
  auth,
}: FeedListProps) {
  const ctx = await getFeedInteractionContext(
    posts.map((p) => p.id),
    auth
  );

  return (
    <FeedList
      posts={posts}
      bookmarkedPostIds={ctx.bookmarkedPostIds}
      isLoggedIn={ctx.isLoggedIn}
      profile={ctx.profile}
      userId={ctx.user?.id}
      commentsByPostId={ctx.commentsByPostId}
      userReactionsByPostId={ctx.userReactionsByPostId}
      referenceNowMs={referenceNowMs}
      emptyMessage={emptyMessage}
      defaultCommentsOpen={defaultCommentsOpen}
    />
  );
}

type PostDetailProps = {
  postId: number;
  auth?: RequestAuth;
};

export async function PostDetailLoader({ postId, auth }: PostDetailProps) {
  const referenceNowMs = Date.now();
  const post = await getPostById(postId);
  if (!post) notFound();

  const [ctx, emergentContext] = await Promise.all([
    getFeedInteractionContext([postId], auth),
    getEmergentPostContext(postId),
  ]);

  return (
    <>
      {emergentContext && (
        <EmergentPostBanner context={emergentContext} />
      )}
      <PostCard
      post={post}
      bookmarkedByUser={ctx.bookmarkedPostIds.includes(post.id)}
      userReaction={ctx.userReactionsByPostId[post.id] ?? null}
      isLoggedIn={ctx.isLoggedIn}
      profile={ctx.profile}
      userId={ctx.user?.id}
      comments={ctx.commentsByPostId[post.id] ?? []}
      referenceNowMs={referenceNowMs}
      defaultCommentsOpen
    />
    </>
  );
}
