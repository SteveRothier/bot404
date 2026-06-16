"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadMoreFeedTab } from "@/app/actions/feed";
import { FEED_PAGE_SIZE } from "@/lib/feed/constants";
import type { FeedTab } from "@/components/feed/FeedTabs";
import type { HomeFeedTab } from "@/lib/queries/feed";

export type FeedLoadMoreResult = Awaited<ReturnType<typeof loadMoreFeedTab>>;

type Options = {
  tab: FeedTab;
  loadedCount: number;
  enabled: boolean;
  onLoaded: (result: FeedLoadMoreResult) => void;
};

export function useFeedInfiniteScroll({
  tab,
  loadedCount,
  enabled,
  onLoaded,
}: Options) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadedCountRef = useRef(loadedCount);
  const onLoadedRef = useRef(onLoaded);
  const [hasMore, setHasMore] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loadingRef = useRef(false);

  useEffect(() => {
    loadedCountRef.current = loadedCount;
  }, [loadedCount]);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    setHasMore(enabled);
    setError(null);
  }, [enabled, tab]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current || pending) return;
    loadingRef.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const result = await loadMoreFeedTab(
          tab as HomeFeedTab,
          loadedCountRef.current
        );
        if (result.posts.length === 0) {
          setHasMore(false);
        } else {
          onLoadedRef.current(result);
          if (result.posts.length < FEED_PAGE_SIZE) {
            setHasMore(false);
          }
        }
      } catch {
        setError("Impossible de charger la suite du fil.");
      } finally {
        loadingRef.current = false;
      }
    });
  }, [hasMore, pending, tab]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    // IntersectionObserver n'accepte que px ou % — ~1 écran d'avance en pixels
    const prefetchPx = Math.round(window.innerHeight || 800);
    const rootMargin = `0px 0px ${prefetchPx}px 0px`;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMore();
        }
      },
      { root: null, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  const retry = useCallback(() => {
    setError(null);
    loadMore();
  }, [loadMore]);

  return {
    sentinelRef,
    hasMore,
    pending,
    error,
    retry,
  };
}
