import { notFound } from "next/navigation";
import { FeedList } from "@/components/feed/FeedList";
import { PostCard } from "@/components/feed/PostCard";
import { getPostById } from "@/lib/queries/feed";
import { getFeedInteractionContext } from "@/lib/queries/feed-context";
import type { PostWithAuthor } from "@/lib/supabase/types";

type FeedListProps = {
  posts: PostWithAuthor[];
  referenceNowMs?: number;
  emptyMessage?: string;
  defaultCommentsOpen?: boolean;
};

export async function FeedListLoader({
  posts,
  referenceNowMs = Date.now(),
  emptyMessage,
  defaultCommentsOpen,
}: FeedListProps) {
  const ctx = await getFeedInteractionContext(posts.map((p) => p.id));

  return (
    <FeedList
      posts={posts}
      likedPostIds={ctx.likedPostIds}
      isLoggedIn={ctx.isLoggedIn}
      profile={ctx.profile}
      userId={ctx.user?.id}
      commentsByPostId={ctx.commentsByPostId}
      referenceNowMs={referenceNowMs}
      emptyMessage={emptyMessage}
      defaultCommentsOpen={defaultCommentsOpen}
    />
  );
}

type PostDetailProps = {
  postId: number;
};

export async function PostDetailLoader({ postId }: PostDetailProps) {
  const referenceNowMs = Date.now();
  const post = await getPostById(postId);
  if (!post) notFound();

  const ctx = await getFeedInteractionContext([postId]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#24101a] bg-[#0c0e16]">
      <PostCard
        post={post}
        likedByUser={ctx.likedPostIds.includes(post.id)}
        isLoggedIn={ctx.isLoggedIn}
        profile={ctx.profile}
        userId={ctx.user?.id}
        comments={ctx.commentsByPostId[post.id] ?? []}
        referenceNowMs={referenceNowMs}
        defaultCommentsOpen
      />
    </div>
  );
}
