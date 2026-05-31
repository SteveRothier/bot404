"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { loadMoreFeedPosts } from "@/app/actions/feed";
import { FeedList } from "@/components/feed/FeedList";
import type { CommentWithAuthor, PostWithAuthor, Profile } from "@/lib/supabase/types";

type Props = {
  initialPosts: PostWithAuthor[];
  initialOffset: number;
  likedPostIds: number[];
  bookmarkedPostIds: number[];
  isLoggedIn: boolean;
  profile: Profile | null;
  userId?: string;
  commentsByPostId: Record<number, CommentWithAuthor[]>;
  referenceNowMs: number;
};

export function FeedLoadMore({
  initialPosts,
  initialOffset,
  likedPostIds,
  bookmarkedPostIds,
  isLoggedIn,
  profile,
  userId,
  commentsByPostId,
  referenceNowMs,
}: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 20);
  const [pending, startTransition] = useTransition();

  if (posts.length === 0) return null;

  return (
    <>
      <FeedList
        posts={posts}
        likedPostIds={likedPostIds}
        bookmarkedPostIds={bookmarkedPostIds}
        isLoggedIn={isLoggedIn}
        profile={profile}
        userId={userId}
        commentsByPostId={commentsByPostId}
        referenceNowMs={referenceNowMs}
      />
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const more = await loadMoreFeedPosts(offset);
                if (more.length === 0) {
                  setHasMore(false);
                  return;
                }
                setPosts((prev) => [...prev, ...more]);
                setOffset((o) => o + more.length);
                if (more.length < 20) setHasMore(false);
              });
            }}
            className="border-[#34121b] bg-[#0c0e16] text-[#fda4af] hover:bg-[#11141f]"
          >
            {pending ? "Chargement…" : "Charger plus"}
          </Button>
        </div>
      )}
    </>
  );
}
