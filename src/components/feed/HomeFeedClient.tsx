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
import { FeedTabContext } from "@/components/feed/FeedSectionShell";
import { FeedLoadMore } from "@/components/feed/FeedLoadMore";
import { FeedList } from "@/components/feed/FeedList";
import { FollowingEmptyState } from "@/components/feed/FollowingEmptyState";
import { PostsSkeleton } from "@/components/feed/FeedSkeleton";
import type { FeedTab } from "@/components/feed/FeedTabs";
import type {
  CommentWithAuthor,
  PostWithAuthor,
  Profile,
  ReactionKind,
} from "@/lib/supabase/types";

const PAGE_SIZE = 20;

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
  const registerBridge = useRegisterFeedBridge();
  const isLoggedIn = !!user;

  const [tabCache, setTabCache] = useState<Set<FeedTab>>(
    () => new Set(["for-you"])
  );
  const [loadingTab, setLoadingTab] = useState<FeedTab | null>(null);
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

  useEffect(() => {
    setRecentPosts(initialRecentPosts);
    setTheoryPosts(initialTheoryPosts);
    setRumorPosts(initialRumorPosts);
    setFollowingPosts(initialFollowingPosts);
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
