import type { FeedTab } from "@/components/feed/FeedTabs";

export type FeedEmptyConfig = {
  message: string;
  showExploreLink?: boolean;
  showLoginCta?: boolean;
  showPublishHint?: boolean;
};

export function getFeedEmptyConfig(
  tab: "for-you" | "theory" | "rumor" | "following",
  isLoggedIn: boolean
): FeedEmptyConfig {
  switch (tab) {
    case "theory":
      return {
        message: "Pas encore de théorie sur le réseau.",
        showExploreLink: !isLoggedIn,
        showLoginCta: !isLoggedIn,
        showPublishHint: isLoggedIn,
      };
    case "rumor":
      return {
        message: "Pas encore de rumeur en circulation.",
        showExploreLink: !isLoggedIn,
        showLoginCta: !isLoggedIn,
        showPublishHint: isLoggedIn,
      };
    case "following":
      return {
        message: "Suivez des profils pour remplir ce fil.",
        showLoginCta: !isLoggedIn,
      };
    default:
      return {
        message: "Aucun signal pour l'instant.",
        showExploreLink: true,
        showLoginCta: !isLoggedIn,
      };
  }
}
