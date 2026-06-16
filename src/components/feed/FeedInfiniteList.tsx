"use client";

import { useCallback } from "react";
import { FeedList } from "@/components/feed/FeedList";
import { FeedInfiniteScrollError } from "@/components/feed/FeedInfiniteScrollError";
import {
  useFeedInfiniteScroll,
  type FeedLoadMoreResult,
} from "@/hooks/useFeedInfiniteScroll";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import type { FeedEmptyConfig } from "@/lib/feed/feed-empty";
import type { FeedTab } from "@/components/feed/FeedTabs";
import type {
  CommentWithAuthor,
  PostWithAuthor,
  Profile,
  ReactionKind,
} from "@/lib/supabase/types";

type Props = {
  tab: FeedTab;
  posts: PostWithAuthor[];
  loadedCount: number;
  bookmarkedPostIds: number[];
  isLoggedIn: boolean;
  profile: Profile | null;
  userId?: string;
  commentsByPostId: Record<number, CommentWithAuthor[]>;
  userReactionsByPostId: Record<number, ReactionKind>;
  referenceNowMs: number;
  emptyConfig: FeedEmptyConfig;
  onLoadMoreResult: (result: FeedLoadMoreResult) => void;
};

export function FeedInfiniteList({
  tab,
  posts,
  loadedCount,
  bookmarkedPostIds,
  isLoggedIn,
  profile,
  userId,
  commentsByPostId,
  userReactionsByPostId,
  referenceNowMs,
  emptyConfig,
  onLoadMoreResult,
}: Props) {
  const handleLoaded = useCallback(
    (result: FeedLoadMoreResult) => {
      onLoadMoreResult(result);
    },
    [onLoadMoreResult]
  );

  const { sentinelRef, hasMore, error, retry } = useFeedInfiniteScroll({
    tab,
    loadedCount,
    enabled: posts.length >= FEED_PAGE_SIZE,
    onLoaded: handleLoaded,
  });

  if (posts.length === 0) {
    return (
      <FeedList posts={[]} isLoggedIn={isLoggedIn} emptyConfig={emptyConfig} />
    );
  }

  return (
    <>
      <FeedList
        posts={posts}
        bookmarkedPostIds={bookmarkedPostIds}
        isLoggedIn={isLoggedIn}
        profile={profile}
        userId={userId}
        commentsByPostId={commentsByPostId}
        userReactionsByPostId={userReactionsByPostId}
        referenceNowMs={referenceNowMs}
      />
      {hasMore && (
        <div
          ref={sentinelRef}
          className="min-h-[1px] w-full"
          aria-hidden
        />
      )}
      {error && (
        <FeedInfiniteScrollError
          error={error}
          onRetry={retry}
        />
      )}
    </>
  );
}
