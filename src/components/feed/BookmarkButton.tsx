"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleBookmark } from "@/app/actions/bookmarks";
import { cn } from "@/lib/utils";

type Props = {
  postId: number;
  bookmarkedByUser?: boolean;
  isLoggedIn?: boolean;
};

export function BookmarkButton({
  postId,
  bookmarkedByUser = false,
  isLoggedIn = false,
}: Props) {
  const [bookmarked, setBookmarked] = useState(bookmarkedByUser);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleBookmark(postId);
          if ("success" in result && result.success) {
            setBookmarked((value) => !value);
          }
        });
      }}
      aria-label={bookmarked ? "Retirer des sauvegardés" : "Sauvegarder"}
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-accent",
        bookmarked && "text-accent"
      )}
    >
      <Bookmark
        className="size-[18px]"
        strokeWidth={1.75}
        fill={bookmarked ? "currentColor" : "none"}
      />
    </button>
  );
}
