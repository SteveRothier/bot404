"use client";

import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { searchProfilesForMention } from "@/app/actions/search";
import { UserAvatar } from "@/components/ui/user-avatar";
import { avatarFallbackSeed } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export type MentionSuggestionsHandle = {
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
};

type Props = {
  query: string;
  onSelect: (username: string) => void;
  className?: string;
};

export const MentionSuggestions = forwardRef<MentionSuggestionsHandle, Props>(
  function MentionSuggestions({ query, onSelect, className }, ref) {
    const [profiles, setProfiles] = useState<
      Awaited<ReturnType<typeof searchProfilesForMention>>
    >([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
      if (!query) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      let cancelled = false;
      setLoading(true);
      const timer = window.setTimeout(async () => {
        const results = await searchProfilesForMention(query);
        if (!cancelled) {
          setProfiles(results);
          setActiveIndex(0);
          setLoading(false);
        }
      }, 200);

      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }, [query]);

    useImperativeHandle(ref, () => ({
      handleKeyDown(e: React.KeyboardEvent) {
        if (!query || profiles.length === 0) return false;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % profiles.length);
          return true;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + profiles.length) % profiles.length);
          return true;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          onSelect(profiles[activeIndex]!.username);
          return true;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          return true;
        }
        return false;
      },
    }));

    if (!query) return null;

    return (
      <ul
        role="listbox"
        aria-label="Suggestions de mentions"
        className={cn(
          "absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-background shadow-lg",
          className
        )}
      >
        {loading && (
          <li className="px-3 py-2 text-sm text-muted-foreground">
            Recherche…
          </li>
        )}
        {!loading && profiles.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">
            Aucun profil trouvé
          </li>
        )}
        {profiles.map((p, index) => (
          <li key={p.id} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-[15px] hover:bg-secondary",
                index === activeIndex && "bg-secondary"
              )}
              onMouseEnter={() => setActiveIndex(index)}
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
);
