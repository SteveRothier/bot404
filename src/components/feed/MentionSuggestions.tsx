"use client";

import { useEffect, useState } from "react";
import { searchProfilesForMention } from "@/app/actions/search";
import { UserAvatar } from "@/components/ui/user-avatar";
import { avatarFallbackSeed } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type Props = {
  query: string;
  onSelect: (username: string) => void;
  className?: string;
};

export function MentionSuggestions({ query, onSelect, className }: Props) {
  const [profiles, setProfiles] = useState<
    Awaited<ReturnType<typeof searchProfilesForMention>>
  >([]);

  useEffect(() => {
    if (!query) {
      setProfiles([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const results = await searchProfilesForMention(query);
      if (!cancelled) setProfiles(results);
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  if (!query || profiles.length === 0) return null;

  return (
    <ul
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-lg",
        className
      )}
    >
      {profiles.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[15px] hover:bg-secondary"
            onClick={() => onSelect(p.username)}
          >
            <UserAvatar
              avatarUrl={p.avatar_url}
              fallbackSeed={avatarFallbackSeed(p)}
              username={p.username}
              className="size-7 rounded-lg"
              imageClassName="rounded-lg object-cover"
            />
            <span className="font-medium">@{p.username}</span>
            {p.is_npc && (
              <span className="text-meta ml-auto text-muted-foreground">
                npc
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
