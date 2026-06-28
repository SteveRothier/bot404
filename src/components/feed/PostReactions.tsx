"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { toggleReaction } from "@/app/actions/reactions";
import { applyReactionToggle, REACTION_LABELS } from "@/lib/reactions";
import { markFeedLiveRefresh } from "@/lib/feed/live-refresh";
import { formatCount } from "@/lib/format";
import { toast } from "@/stores/toast-store";
import { HoverTooltip } from "@/components/ui/hover-tooltip";
import { cn } from "@/lib/utils";
import type { ReactionKind } from "@/lib/supabase/types";

type Props = {
  postId: number;
  relayCount: number;
  userReaction: ReactionKind | null;
  isLoggedIn: boolean;
};

function normalizeUserReaction(
  reaction: ReactionKind | null | undefined
): ReactionKind | null {
  return reaction === "relay" ? "relay" : null;
}

export function PostReactions({
  postId,
  relayCount,
  userReaction,
  isLoggedIn,
}: Props) {
  const normalizedReaction = normalizeUserReaction(userReaction);
  const [active, setActive] = useState<ReactionKind | null>(normalizedReaction);
  const [count, setCount] = useState(relayCount);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setActive(normalizeUserReaction(userReaction));
    setCount(relayCount);
  }, [userReaction, relayCount]);

  const label = REACTION_LABELS.relay.label;

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <HoverTooltip label={label}>
          <Link
            href="/login"
            className="flex items-center gap-1 rounded-full px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
          >
            <Heart className="size-[16px]" strokeWidth={1.75} />
            <span>{formatCount(count)}</span>
          </Link>
        </HoverTooltip>
      </div>
    );
  }

  const isActive = active === "relay";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <HoverTooltip label={label}>
        <button
          type="button"
          aria-label={label}
          onClick={() => {
            const prevActive = active;
            const prevCount = count;
            const next = applyReactionToggle(prevActive, { relay: count }, "relay");
            setActive(next.active);
            setCount(next.counts.relay);

            startTransition(async () => {
              const result = await toggleReaction(postId, "relay");
              if (!("success" in result) || !result.success) {
                setActive(prevActive);
                setCount(prevCount);
                toast("Impossible d'enregistrer la réaction.");
                return;
              }

              markFeedLiveRefresh();
            });
          }}
          className={cn(
            "flex items-center gap-1 rounded-full px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent",
            isActive && "text-accent"
          )}
        >
          <Heart
            className={cn("size-[16px]", isActive && "fill-current")}
            strokeWidth={1.75}
          />
          <span className="text-meta">{formatCount(count)}</span>
        </button>
      </HoverTooltip>
    </div>
  );
}
