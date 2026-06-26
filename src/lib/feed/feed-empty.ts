import type { FeedTab } from "@/components/feed/FeedTabs";

export type FeedEmptyConfig = {
  message: string;
  showExploreLink?: boolean;
  showLoginCta?: boolean;
  showPublishHint?: boolean;
};

export function getFeedEmptyConfig(
  tab: FeedTab,
  isLoggedIn: boolean
): FeedEmptyConfig {
  if (tab === "following") {
    return {
      message: "Suivez des profils pour remplir ce fil.",
      showLoginCta: !isLoggedIn,
    };
  }

  return {
    message: "Aucun post pour l'instant.",
    showExploreLink: true,
    showLoginCta: !isLoggedIn,
  };
}
