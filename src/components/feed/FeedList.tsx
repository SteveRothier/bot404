import Link from "next/link";
import { PostCard } from "@/components/feed/PostCard";
import type {
  CommentWithAuthor,
  PostWithAuthor,
  Profile,
  ReactionKind,
} from "@/lib/supabase/types";

type Props = {
  posts: PostWithAuthor[];
  likedPostIds?: number[];
  bookmarkedPostIds?: number[];
  isLoggedIn?: boolean;
  profile?: Profile | null;
  userId?: string;
  commentsByPostId?: Record<number, CommentWithAuthor[]>;
  userReactionsByPostId?: Record<number, ReactionKind>;
  referenceNowMs?: number;
  emptyMessage?: string;
  defaultCommentsOpen?: boolean;
};

export function FeedList({
  posts,
  likedPostIds = [],
  bookmarkedPostIds = [],
  isLoggedIn = false,
  profile = null,
  userId,
  commentsByPostId = {},
  userReactionsByPostId = {},
  referenceNowMs = Date.now(),
  emptyMessage = "Aucun post pour l'instant.",
  defaultCommentsOpen = false,
}: Props) {
  if (posts.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-[15px] text-muted-foreground">{emptyMessage}</p>
        {!isLoggedIn && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[15px]">
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-2 font-bold text-accent-foreground hover:bg-accent/90"
            >
              Se connecter
            </Link>
            <Link href="/trending" className="text-accent hover:underline">
              Explorer les tendances
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          likedByUser={likedPostIds.includes(post.id)}
          bookmarkedByUser={bookmarkedPostIds.includes(post.id)}
          userReaction={userReactionsByPostId[post.id] ?? null}
          isLoggedIn={isLoggedIn}
          profile={profile}
          userId={userId}
          comments={commentsByPostId[post.id] ?? []}
          referenceNowMs={referenceNowMs}
          defaultCommentsOpen={defaultCommentsOpen}
        />
      ))}
    </div>
  );
}
