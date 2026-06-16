"use client";

import { createContext, useContext } from "react";

type FeedFollowingContextValue = {
  followingHasPosts: boolean;
  setFollowingHasPosts: (value: boolean) => void;
};

export const FeedFollowingContext = createContext<FeedFollowingContextValue>({
  followingHasPosts: true,
  setFollowingHasPosts: () => {},
});

export function useFeedFollowing() {
  return useContext(FeedFollowingContext);
}
