"use client";

import { useEffect, useRef } from "react";
import {
  fetchFeedCommentById,
  fetchFeedPostById,
} from "@/app/actions/feed";
import { useFeedBridge } from "@/components/feed/FeedBridgeContext";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 400;

type Props = {
  children: React.ReactNode;
};

export function FeedRealtime({ children }: Props) {
  const bridge = useFeedBridge();
  const pendingPostIds = useRef(new Set<number>());
  const pendingCommentIds = useRef(new Set<number>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function flush() {
      const postIds = [...pendingPostIds.current];
      const commentIds = [...pendingCommentIds.current];
      pendingPostIds.current.clear();
      pendingCommentIds.current.clear();

      await Promise.all([
        ...postIds.map(async (id) => {
          const post = await fetchFeedPostById(id);
          if (post) bridge.prependPost(post, "for-you");
        }),
        ...commentIds.map(async (id) => {
          const comment = await fetchFeedCommentById(id);
          if (comment) bridge.prependComment(comment.post_id, comment);
        }),
      ]);
    }

    function scheduleFlush() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flush();
      }, DEBOUNCE_MS);
    }

    const channel = supabase
      .channel("feed-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const id = payload.new?.id;
          if (typeof id === "number") {
            pendingPostIds.current.add(id);
            scheduleFlush();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const id = payload.new?.id;
          if (typeof id === "number") {
            pendingCommentIds.current.add(id);
            scheduleFlush();
          }
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [bridge]);

  return <>{children}</>;
}
