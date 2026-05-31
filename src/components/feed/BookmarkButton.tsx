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
          if (!result.error) {
            setBookmarked((value) => !value);
          }
        });
      }}
      aria-label={bookmarked ? "Retirer des sauvegardés" : "Sauvegarder"}
      className={cn(
        "flex items-center gap-1.5 text-sm transition-colors hover:text-[#c4b5fd]",
        bookmarked ? "text-[#c4b5fd]" : "text-[#6b7280]"
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
