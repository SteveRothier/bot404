"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { toggleLike } from "@/app/actions/posts";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  postId: number;
  likesCount: number;
  likedByUser: boolean;
  isLoggedIn: boolean;
};

export function LikeButton({
  postId,
  likesCount,
  likedByUser,
  isLoggedIn,
}: Props) {
  const [liked, setLiked] = useState(likedByUser);
  const [count, setCount] = useState(likesCount);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rose-400"
      >
        <Heart className="h-4 w-4" />
        <span>{formatCount(count)}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleLike(postId);
          if (result.success) {
            setLiked(!!result.liked);
            setCount((c) => (result.liked ? c + 1 : Math.max(c - 1, 0)));
          }
        });
      }}
      className={cn(
        "flex items-center gap-1.5 text-sm hover:text-rose-400",
        liked && "text-rose-400"
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      <span>{formatCount(count)}</span>
    </button>
  );
}
