"use client";

import { createContext, useContext, useState } from "react";
import { FeedLoadMore } from "@/components/feed/FeedLoadMore";
import { FeedList } from "@/components/feed/FeedList";
import { PostComposerForm } from "@/components/feed/PostComposerForm";
import { FeedTabs, type FeedTab } from "@/components/feed/FeedTabs";
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
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  likedPostIds: number[];
  commentsByPostId: Record<number, CommentWithAuthor[]>;
  referenceNowMs: number;
};

function postsForTab(
  tab: FeedTab,
  recentPosts: PostWithAuthor[],
  popularPosts: PostWithAuthor[]
) {
  switch (tab) {
    case "recent":
      return recentPosts;
    case "rumors":
    case "theories":
      return popularPosts;
    case "following":
      return [];
    default:
      return recentPosts;
  }
}

export function FeedPosts({
  recentPosts,
  popularPosts,
  user,
  profile,
  likedPostIds,
  commentsByPostId,
  referenceNowMs,
}: PostsProps) {
  const tab = useContext(FeedTabContext);
  const isLoggedIn = !!user;
  const posts = postsForTab(tab, recentPosts, popularPosts);
  const emptyMessage =
    tab === "following"
      ? "Aucun profil suivi pour l'instant."
      : "Le réseau s'initialise…";
  const showLoadMore = tab === "for-you" || tab === "recent";

  if (showLoadMore && posts.length > 0) {
    return (
      <FeedLoadMore
        initialPosts={posts.slice(0, PAGE_SIZE)}
        initialOffset={PAGE_SIZE}
        likedPostIds={likedPostIds}
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
      isLoggedIn={isLoggedIn}
      profile={profile}
      userId={user?.id}
      commentsByPostId={commentsByPostId}
      referenceNowMs={referenceNowMs}
      emptyMessage={emptyMessage}
    />
  );
}
