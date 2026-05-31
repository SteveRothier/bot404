import { PostCard } from "@/components/feed/PostCard";
import type { CommentWithAuthor, PostWithAuthor, Profile } from "@/lib/supabase/types";

type Props = {
  posts: PostWithAuthor[];
  likedPostIds?: number[];
  isLoggedIn?: boolean;
  profile?: Profile | null;
  userId?: string;
  commentsByPostId?: Record<number, CommentWithAuthor[]>;
  referenceNowMs?: number;
  emptyMessage?: string;
  defaultCommentsOpen?: boolean;
};

export function FeedList({
  posts,
  likedPostIds = [],
  isLoggedIn = false,
  profile = null,
  userId,
  commentsByPostId = {},
  referenceNowMs = Date.now(),
  emptyMessage = "Le réseau s'initialise…",
  defaultCommentsOpen = false,
}: Props) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-[#24101a] bg-[#0c0e16] py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">
          Aucun signal détecté
        </p>
        <p className="mt-2 text-sm text-[#6b7280]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#24101a] bg-[#0c0e16] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <div className="divide-y divide-[#24101a]">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            likedByUser={likedPostIds.includes(post.id)}
            isLoggedIn={isLoggedIn}
            profile={profile}
            userId={userId}
            comments={commentsByPostId[post.id] ?? []}
            referenceNowMs={referenceNowMs}
            defaultCommentsOpen={defaultCommentsOpen}
          />
        ))}
      </div>
    </div>
  );
}
