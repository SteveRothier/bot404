"use client";

import { createContext, useContext, useState } from "react";
import { FeedLoadMore } from "@/components/feed/FeedLoadMore";
import { FeedList } from "@/components/feed/FeedList";
import { FollowingEmptyState } from "@/components/feed/FollowingEmptyState";
import { PostComposerForm } from "@/components/feed/PostComposerForm";
import { FeedTabs, type FeedTab } from "@/components/feed/FeedTabs";
import {
  filterRumorPosts,
  filterTheoryPosts,
} from "@/lib/feed-filters";
import type { CommentWithAuthor, PostWithAuthor, Profile } from "@/lib/supabase/types";

const PAGE_SIZE = 20;
const FeedTabContext = createContext<FeedTab>("for-you");

type ShellProps = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  children: React.ReactNode;
};

export function FeedSection({ user, profile, children }: ShellProps) {
  const [tab, setTab] = useState<FeedTab>("for-you");

  return (
    <FeedTabContext.Provider value={tab}>
      <div className="mx-auto w-full max-w-[720px]">
        <PostComposerForm user={user} profile={profile} />
        <FeedTabs value={tab} onChange={setTab} />
        <div className="mt-4">{children}</div>
      </div>
    </FeedTabContext.Provider>
  );
}

type PostsProps = {
  recentPosts: PostWithAuthor[];
  popularPosts: PostWithAuthor[];
  followingPosts: PostWithAuthor[];
  suggestedNpcs: Profile[];
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  likedPostIds: number[];
  bookmarkedPostIds: number[];
  commentsByPostId: Record<number, CommentWithAuthor[]>;
  referenceNowMs: number;
};

function postsForTab(
  tab: FeedTab,
  recentPosts: PostWithAuthor[],
  popularPosts: PostWithAuthor[],
  followingPosts: PostWithAuthor[]
) {
  const rumorSource = [...recentPosts, ...popularPosts];
  const uniqueRumorSource = [
    ...new Map(rumorSource.map((post) => [post.id, post])).values(),
  ];

  switch (tab) {
    case "recent":
      return recentPosts;
    case "rumors":
      return filterRumorPosts(uniqueRumorSource);
    case "theories":
      return filterTheoryPosts(uniqueRumorSource);
    case "following":
      return followingPosts;
    default:
      return recentPosts;
  }
}

export function FeedPosts({
  recentPosts,
  popularPosts,
  followingPosts,
  suggestedNpcs,
  user,
  profile,
  likedPostIds,
  bookmarkedPostIds,
  commentsByPostId,
  referenceNowMs,
}: PostsProps) {
  const tab = useContext(FeedTabContext);
  const isLoggedIn = !!user;
  const posts = postsForTab(tab, recentPosts, popularPosts, followingPosts);
  const emptyMessage =
    tab === "following"
      ? "Aucun profil suivi pour l'instant."
      : tab === "rumors"
        ? "Aucune rumeur détectée pour l'instant."
        : tab === "theories"
          ? "Aucune théorie détectée pour l'instant."
          : "Le réseau s'initialise…";
  const showLoadMore = tab === "for-you" || tab === "recent";

  if (tab === "following" && posts.length === 0) {
    return <FollowingEmptyState suggestedNpcs={suggestedNpcs} />;
  }

  if (showLoadMore && posts.length > 0) {
    return (
      <FeedLoadMore
        initialPosts={posts.slice(0, PAGE_SIZE)}
        initialOffset={PAGE_SIZE}
        likedPostIds={likedPostIds}
        bookmarkedPostIds={bookmarkedPostIds}
        isLoggedIn={isLoggedIn}
        profile={profile}
        userId={user?.id}
        commentsByPostId={commentsByPostId}
        referenceNowMs={referenceNowMs}
      />
    );
  }

  return (
    <FeedList
      posts={posts}
      likedPostIds={likedPostIds}
      bookmarkedPostIds={bookmarkedPostIds}
      isLoggedIn={isLoggedIn}
      profile={profile}
      userId={user?.id}
      commentsByPostId={commentsByPostId}
      referenceNowMs={referenceNowMs}
      emptyMessage={emptyMessage}
    />
  );
}
