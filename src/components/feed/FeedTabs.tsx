"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export type FeedTab = "for-you" | "theory" | "rumor" | "following";

export function postTypeForFeedTab(tab: FeedTab): "message" | "theory" | "rumor" {
  if (tab === "theory") return "theory";
  if (tab === "rumor") return "rumor";
  return "message";
}

export function composerPlaceholderForFeedTab(tab: FeedTab): string {
  if (tab === "theory") return "Formuler une théorie…";
  if (tab === "rumor") return "Diffusez une rumeur…";
  return "Émettre un signal…";
}

const tabs: { value: FeedTab; label: string }[] = [
  { value: "for-you", label: "Signaux" },
  { value: "theory", label: "Théories" },
  { value: "rumor", label: "Rumeurs" },
  { value: "following", label: "Suivis" },
];

type Props = {
  value: FeedTab;
  onChange: (v: FeedTab) => void;
};

export function FeedTabs({ value, onChange }: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = useCallback((index: number) => {
    tabRefs.current[index]?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      focusTab(nextIndex);
    }
  }

  return (
    <nav
      role="tablist"
      aria-label="Filtrer le feed"
      className="flex overflow-x-auto border-b border-border scrollbar-none"
    >
      {tabs.map((tab, index) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`feed-tab-${tab.value}`}
            aria-selected={active}
            aria-controls={`feed-panel-${tab.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative shrink-0 px-3 py-4 text-center text-[15px] transition-colors hover:bg-secondary/50 sm:flex-1 sm:px-4",
              active
                ? "font-bold text-foreground"
                : "font-normal text-muted-foreground"
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
