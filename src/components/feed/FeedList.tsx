import Link from "next/link";
import { PostCard } from "@/components/feed/PostCard";
import type { FeedEmptyConfig } from "@/lib/feed/feed-empty";
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
  emptyConfig?: FeedEmptyConfig;
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
  emptyConfig,
  defaultCommentsOpen = false,
}: Props) {
  if (posts.length === 0) {
    const config = emptyConfig ?? { message: emptyMessage };
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-[15px] text-muted-foreground">{config.message}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[15px]">
          {config.showPublishHint && isLoggedIn && (
            <p className="w-full text-sm text-muted-foreground">
              Utilisez le compositeur ci-dessus pour publier.
            </p>
          )}
          {config.showLoginCta && !isLoggedIn && (
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-2 font-bold text-accent-foreground hover:bg-accent/90"
            >
              Se connecter
            </Link>
          )}
          {config.showExploreLink && (
            <Link href="/trending" className="text-accent hover:underline">
              Explorer les tendances
            </Link>
          )}
        </div>
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
