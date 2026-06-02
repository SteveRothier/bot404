"use client";

import { createContext, useContext, useState } from "react";
import { FeedLoadMore } from "@/components/feed/FeedLoadMore";
import { FeedList } from "@/components/feed/FeedList";
import { FollowingEmptyState } from "@/components/feed/FollowingEmptyState";
import { PostComposerForm } from "@/components/feed/PostComposerForm";
import { FeedTabs, type FeedTab } from "@/components/feed/FeedTabs";
import { ArchiveUnlockBanner } from "@/components/lore/ArchiveUnlockBanner";
import { WorldEventBanner } from "@/components/lore/WorldEventBanner";
import type {
  Archive,
  CommentWithAuthor,
  PostWithAuthor,
  Profile,
  ReactionKind,
  WorldEvent,
} from "@/lib/supabase/types";

const PAGE_SIZE = 20;
export const FeedTabContext = createContext<FeedTab>("for-you");

type ShellProps = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  activeWorldEvent?: WorldEvent | null;
  recentArchive?: Archive | null;
  children: React.ReactNode;
};

export function FeedSectionShell({
  user,
  profile,
  activeWorldEvent = null,
  recentArchive = null,
  children,
}: ShellProps) {
  const [tab, setTab] = useState<FeedTab>("for-you");

  return (
    <FeedTabContext.Provider value={tab}>
      <div className="w-full">
        <FeedTabs value={tab} onChange={setTab} />
        {activeWorldEvent && <WorldEventBanner event={activeWorldEvent} />}
        {recentArchive && <ArchiveUnlockBanner archive={recentArchive} />}
        <PostComposerForm user={user} profile={profile} feedTab={tab} />
        {children}
      </div>
    </FeedTabContext.Provider>
  );
}

type PostsProps = {
  recentPosts: PostWithAuthor[];
  theoryPosts: PostWithAuthor[];
  rumorPosts: PostWithAuthor[];
  followingPosts: PostWithAuthor[];
  suggestedNpcs: Profile[];
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  likedPostIds: number[];
  bookmarkedPostIds: number[];
  commentsByPostId: Record<number, CommentWithAuthor[]>;
  userReactionsByPostId: Record<number, ReactionKind>;
  referenceNowMs: number;
};

function postsForTab(
  tab: FeedTab,
  recentPosts: PostWithAuthor[],
  theoryPosts: PostWithAuthor[],
  rumorPosts: PostWithAuthor[],
  followingPosts: PostWithAuthor[]
) {
  if (tab === "following") return followingPosts;
  if (tab === "theory") return theoryPosts;
  if (tab === "rumor") return rumorPosts;
  return recentPosts;
}

export function FeedPosts({
  recentPosts,
  theoryPosts,
  rumorPosts,
  followingPosts,
  suggestedNpcs,
  user,
  profile,
  likedPostIds,
  bookmarkedPostIds,
  commentsByPostId,
  userReactionsByPostId,
  referenceNowMs,
}: PostsProps) {
  const tab = useContext(FeedTabContext);
  const isLoggedIn = !!user;
  const posts = postsForTab(
    tab,
    recentPosts,
    theoryPosts,
    rumorPosts,
    followingPosts
  );
  const emptyMessage =
    tab === "following"
      ? "Aucun profil suivi pour l'instant."
      : tab === "theory"
        ? "Aucune théorie pour l'instant."
        : tab === "rumor"
          ? "Aucune rumeur pour l'instant."
          : "Aucun post pour l'instant.";
  const showLoadMore = tab === "for-you";

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
        userReactionsByPostId={userReactionsByPostId}
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
      userReactionsByPostId={userReactionsByPostId}
      referenceNowMs={referenceNowMs}
      emptyMessage={emptyMessage}
    />
  );
}
