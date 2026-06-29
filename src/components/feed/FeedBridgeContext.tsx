"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import type { CommentWithAuthor, PostWithAuthor } from "@/lib/supabase/types";
import type { FeedTab } from "@/components/feed/FeedTabs";

export type FeedBridgeApi = {
  prependPost: (post: PostWithAuthor, tab: FeedTab) => void;
  prependComment: (postId: number, comment: CommentWithAuthor) => void;
  updateCommentRelayCount: (
    postId: number,
    commentId: number,
    relayCount: number
  ) => void;
};

const noop: FeedBridgeApi = {
  prependPost: () => {},
  prependComment: () => {},
  updateCommentRelayCount: () => {},
};

export const FeedBridgeContext = createContext<FeedBridgeApi>(noop);

const FeedBridgeRegistrationContext = createContext<
  (api: FeedBridgeApi | null) => void
>(() => {});

export function useFeedBridge() {
  return useContext(FeedBridgeContext);
}

export function useRegisterFeedBridge() {
  return useContext(FeedBridgeRegistrationContext);
}

export function FeedBridgeProvider({ children }: { children: React.ReactNode }) {
  const apiRef = useRef<FeedBridgeApi>(noop);
  const register = useCallback((api: FeedBridgeApi | null) => {
    apiRef.current = api ?? noop;
  }, []);
  const bridge = useMemo<FeedBridgeApi>(
    () => ({
      prependPost: (post, tab) => apiRef.current.prependPost(post, tab),
      prependComment: (postId, comment) =>
        apiRef.current.prependComment(postId, comment),
      updateCommentRelayCount: (postId, commentId, relayCount) =>
        apiRef.current.updateCommentRelayCount(postId, commentId, relayCount),
    }),
    []
  );

  return (
    <FeedBridgeRegistrationContext.Provider value={register}>
      <FeedBridgeContext.Provider value={bridge}>{children}</FeedBridgeContext.Provider>
    </FeedBridgeRegistrationContext.Provider>
  );
}
