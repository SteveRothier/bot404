"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadHomeFeedTab } from "@/app/actions/feed";
import { FeedLoadMore } from "@/components/feed/FeedLoadMore";
import { FeedList } from "@/components/feed/FeedList";
import { FollowingEmptyState } from "@/components/feed/FollowingEmptyState";
import { PostComposerForm } from "@/components/feed/PostComposerForm";
import { FeedTabs, type FeedTab } from "@/components/feed/FeedTabs";
import { PostsSkeleton } from "@/components/feed/FeedSkeleton";
import { ActiveWorldEventStrip } from "@/components/lore/ActiveWorldEventStrip";
import type {
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
  children: React.ReactNode;
};

export function FeedSectionShell({
  user,
  profile,
  activeWorldEvent = null,
  children,
}: ShellProps) {
  const [tab, setTab] = useState<FeedTab>("for-you");

  return (
    <FeedTabContext.Provider value={tab}>
      <div className="w-full">
        <FeedTabs value={tab} onChange={setTab} />
        {activeWorldEvent && <ActiveWorldEventStrip event={activeWorldEvent} />}
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
  theoryPosts: initialTheoryPosts,
  rumorPosts: initialRumorPosts,
  followingPosts: initialFollowingPosts,
  suggestedNpcs: initialSuggestedNpcs,
  user,
  profile,
  likedPostIds: initialLikedPostIds,
  bookmarkedPostIds: initialBookmarkedPostIds,
  commentsByPostId: initialCommentsByPostId,
  userReactionsByPostId: initialUserReactionsByPostId,
  referenceNowMs,
}: PostsProps) {
  const tab = useContext(FeedTabContext);
  const isLoggedIn = !!user;

  const [tabCache, setTabCache] = useState<Set<FeedTab>>(
    () => new Set(["for-you"])
  );
  const [loadingTab, setLoadingTab] = useState<FeedTab | null>(null);
  const [theoryPosts, setTheoryPosts] = useState(initialTheoryPosts);
  const [rumorPosts, setRumorPosts] = useState(initialRumorPosts);
  const [followingPosts, setFollowingPosts] = useState(initialFollowingPosts);
  const [suggestedNpcs, setSuggestedNpcs] = useState(initialSuggestedNpcs);
  const [likedPostIds, setLikedPostIds] = useState(initialLikedPostIds);
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState(
    initialBookmarkedPostIds
  );
  const [commentsByPostId, setCommentsByPostId] = useState(
    initialCommentsByPostId
  );
  const [userReactionsByPostId, setUserReactionsByPostId] = useState(
    initialUserReactionsByPostId
  );

  useEffect(() => {
    if (tab === "for-you" || tabCache.has(tab)) return;

    let cancelled = false;
    setLoadingTab(tab);

    loadHomeFeedTab(tab).then((payload) => {
      if (cancelled) return;
      setTabCache((prev) => new Set(prev).add(tab));
      if (tab === "theory") setTheoryPosts(payload.posts);
      if (tab === "rumor") setRumorPosts(payload.posts);
      if (tab === "following") {
        setFollowingPosts(payload.posts);
        if (payload.suggestedNpcs.length > 0) {
          setSuggestedNpcs(payload.suggestedNpcs);
        }
      }
      setLikedPostIds((prev) => [
        ...new Set([...prev, ...payload.likedPostIds]),
      ]);
      setBookmarkedPostIds((prev) => [
        ...new Set([...prev, ...payload.bookmarkedPostIds]),
      ]);
      setCommentsByPostId((prev) => ({
        ...prev,
        ...payload.commentsByPostId,
      }));
      setUserReactionsByPostId((prev) => ({
        ...prev,
        ...payload.userReactionsByPostId,
      }));
      setLoadingTab(null);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- merge once per tab fetch
  }, [tab, tabCache]);

  const posts = useMemo(
    () =>
      postsForTab(tab, recentPosts, theoryPosts, rumorPosts, followingPosts),
    [tab, recentPosts, theoryPosts, rumorPosts, followingPosts]
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

  if (loadingTab === tab) {
    return <PostsSkeleton count={3} />;
  }

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
