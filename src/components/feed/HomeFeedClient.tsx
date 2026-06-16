"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadHomeFeedTab } from "@/app/actions/feed";
import {
  useRegisterFeedBridge,
  type FeedBridgeApi,
} from "@/components/feed/FeedBridgeContext";
import { useFeedFollowing } from "@/components/feed/FeedFollowingContext";
import { FeedTabContext } from "@/components/feed/FeedSectionShell";
import { FeedInfiniteList } from "@/components/feed/FeedInfiniteList";
import { FollowingEmptyState } from "@/components/feed/FollowingEmptyState";
import { PostsSkeleton } from "@/components/feed/FeedSkeleton";
import type { FeedTab } from "@/components/feed/FeedTabs";
import { getFeedEmptyConfig } from "@/lib/feed/feed-empty";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import type { FeedLoadMoreResult } from "@/hooks/useFeedInfiniteScroll";
import type {
  CommentWithAuthor,
  PostWithAuthor,
  Profile,
  ReactionKind,
} from "@/lib/supabase/types";

type Props = {
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

function prependUnique(post: PostWithAuthor, list: PostWithAuthor[]) {
  return [post, ...list.filter((p) => p.id !== post.id)];
}

function mergePostsPreservePolls(
  incoming: PostWithAuthor[],
  previous: PostWithAuthor[]
): PostWithAuthor[] {
  const pollById = new Map(
    previous.filter((p) => p.poll).map((p) => [p.id, p.poll!])
  );
  return incoming.map((post) => ({
    ...post,
    poll: post.poll ?? pollById.get(post.id) ?? null,
  }));
}

function mergeAppended(
  tab: FeedTab,
  result: FeedLoadMoreResult,
  appendedByTab: Partial<Record<FeedTab, PostWithAuthor[]>>,
  basePosts: PostWithAuthor[]
): PostWithAuthor[] {
  const existingIds = new Set([
    ...basePosts.map((p) => p.id),
    ...(appendedByTab[tab] ?? []).map((p) => p.id),
  ]);
  const fresh = result.posts.filter((p) => !existingIds.has(p.id));
  return [...(appendedByTab[tab] ?? []), ...fresh];
}

export function HomeFeedClient({
  recentPosts: initialRecentPosts,
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
}: Props) {
  const tab = useContext(FeedTabContext);
  const { setFollowingHasPosts } = useFeedFollowing();
  const registerBridge = useRegisterFeedBridge();
  const isLoggedIn = !!user;

  const [tabCache, setTabCache] = useState<Set<FeedTab>>(
    () => new Set(["for-you"])
  );
  const [loadingTab, setLoadingTab] = useState<FeedTab | null>(null);
  const [tabLoadError, setTabLoadError] = useState<string | null>(null);
  const [recentPosts, setRecentPosts] = useState(initialRecentPosts);
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
  const [appendedByTab, setAppendedByTab] = useState<
    Partial<Record<FeedTab, PostWithAuthor[]>>
  >({});
  const [loadedCountByTab, setLoadedCountByTab] = useState<
    Partial<Record<FeedTab, number>>
  >({
    "for-you": initialRecentPosts.length,
  });

  useEffect(() => {
    setRecentPosts((prev) => mergePostsPreservePolls(initialRecentPosts, prev));
    setTheoryPosts((prev) => mergePostsPreservePolls(initialTheoryPosts, prev));
    setRumorPosts((prev) => mergePostsPreservePolls(initialRumorPosts, prev));
    setFollowingPosts((prev) =>
      mergePostsPreservePolls(initialFollowingPosts, prev)
    );
    setSuggestedNpcs(initialSuggestedNpcs);
    setLikedPostIds(initialLikedPostIds);
    setBookmarkedPostIds(initialBookmarkedPostIds);
    setCommentsByPostId(initialCommentsByPostId);
    setUserReactionsByPostId(initialUserReactionsByPostId);
  }, [
    initialRecentPosts,
    initialTheoryPosts,
    initialRumorPosts,
    initialFollowingPosts,
    initialSuggestedNpcs,
    initialLikedPostIds,
    initialBookmarkedPostIds,
    initialCommentsByPostId,
    initialUserReactionsByPostId,
  ]);

  useEffect(() => {
    setFollowingHasPosts(followingPosts.length > 0);
  }, [followingPosts.length, setFollowingHasPosts]);

  const prependPost = useCallback(
    (post: PostWithAuthor, activeTab: FeedTab) => {
      setRecentPosts((prev) => prependUnique(post, prev));
      if (post.post_type === "theory") {
        setTheoryPosts((prev) => prependUnique(post, prev));
      }
      if (post.post_type === "rumor") {
        setRumorPosts((prev) => prependUnique(post, prev));
      }
      if (user?.id === post.author_id) {
        setFollowingPosts((prev) => prependUnique(post, prev));
      }
      if (activeTab !== "for-you" && !tabCache.has(activeTab)) {
        setTabCache((prev) => new Set(prev).add(activeTab));
      }
    },
    [user?.id, tabCache]
  );

  const prependComment = useCallback(
    (postId: number, comment: CommentWithAuthor) => {
      setCommentsByPostId((prev) => {
        const existing = prev[postId] ?? [];
        if (existing.some((c) => c.id === comment.id)) return prev;
        return { ...prev, [postId]: [...existing, comment] };
      });
    },
    []
  );

  useEffect(() => {
    const api: FeedBridgeApi = { prependPost, prependComment };
    registerBridge(api);
    return () => registerBridge(null);
  }, [registerBridge, prependPost, prependComment]);

  useEffect(() => {
    if (tab === "for-you" || tabCache.has(tab)) return;

    let cancelled = false;
    setLoadingTab(tab);
    setTabLoadError(null);

    loadHomeFeedTab(tab)
      .then((payload) => {
        if (cancelled) return;
        setTabCache((prev) => new Set(prev).add(tab));
        setLoadedCountByTab((prev) => ({
          ...prev,
          [tab]: payload.posts.length,
        }));
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
      })
      .catch(() => {
        if (cancelled) return;
        setTabLoadError("Impossible de charger ce fil.");
        setLoadingTab(null);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- merge once per tab fetch
  }, [tab, tabCache]);

  const basePosts = useMemo(
    () =>
      postsForTab(tab, recentPosts, theoryPosts, rumorPosts, followingPosts),
    [tab, recentPosts, theoryPosts, rumorPosts, followingPosts]
  );

  const displayPosts = useMemo(() => {
    const appended = appendedByTab[tab] ?? [];
    const ids = new Set(basePosts.map((p) => p.id));
    return [...basePosts, ...appended.filter((p) => !ids.has(p.id))];
  }, [tab, basePosts, appendedByTab]);

  const loadedCount =
    loadedCountByTab[tab] ??
    (tab === "for-you" ? initialRecentPosts.length : FEED_PAGE_SIZE);

  const handleLoadMoreResult = useCallback(
    (result: FeedLoadMoreResult) => {
      setAppendedByTab((prev) => ({
        ...prev,
        [tab]: mergeAppended(tab, result, prev, basePosts),
      }));
      setLoadedCountByTab((prev) => ({
        ...prev,
        [tab]: (prev[tab] ?? loadedCount) + result.posts.length,
      }));
      setLikedPostIds((prev) => [
        ...new Set([...prev, ...result.likedPostIds]),
      ]);
      setBookmarkedPostIds((prev) => [
        ...new Set([...prev, ...result.bookmarkedPostIds]),
      ]);
      setCommentsByPostId((prev) => ({
        ...prev,
        ...result.commentsByPostId,
      }));
      setUserReactionsByPostId((prev) => ({
        ...prev,
        ...result.userReactionsByPostId,
      }));
    },
    [tab, basePosts, loadedCount]
  );

  const emptyConfig = getFeedEmptyConfig(tab, isLoggedIn);

  if (loadingTab === tab) {
    return <PostsSkeleton count={3} />;
  }

  if (tabLoadError) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-[15px] text-destructive" role="alert">
          {tabLoadError}
        </p>
      </div>
    );
  }

  if (tab === "following" && displayPosts.length === 0) {
    return (
      <FollowingEmptyState
        suggestedNpcs={suggestedNpcs}
        isLoggedIn={isLoggedIn}
      />
    );
  }

  return (
    <FeedInfiniteList
      tab={tab}
      posts={displayPosts}
      loadedCount={loadedCount}
      likedPostIds={likedPostIds}
      bookmarkedPostIds={bookmarkedPostIds}
      isLoggedIn={isLoggedIn}
      profile={profile}
      userId={user?.id}
      commentsByPostId={commentsByPostId}
      userReactionsByPostId={userReactionsByPostId}
      referenceNowMs={referenceNowMs}
      emptyConfig={emptyConfig}
      onLoadMoreResult={handleLoadMoreResult}
    />
  );
}
