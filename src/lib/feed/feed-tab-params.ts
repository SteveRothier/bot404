import type { FeedTab } from "@/components/feed/FeedTabs";

const VALID_TABS = new Set<FeedTab>([
  "for-you",
  "theory",
  "rumor",
  "following",
]);

export function parseFeedTabParam(
  value: string | string[] | undefined | null
): FeedTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && VALID_TABS.has(raw as FeedTab) && raw !== "for-you") {
    return raw as FeedTab;
  }
  return "for-you";
}

export function feedTabToSearchParam(tab: FeedTab): string | null {
  if (tab === "for-you") return null;
  return tab;
}
