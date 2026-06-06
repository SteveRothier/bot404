"use client";

import dynamic from "next/dynamic";

const FeedRealtime = dynamic(
  () =>
    import("@/components/feed/FeedRealtime").then((m) => m.FeedRealtime),
  { ssr: false }
);

type Props = {
  children: React.ReactNode;
};

export function FeedRealtimeLazy({ children }: Props) {
  return <FeedRealtime>{children}</FeedRealtime>;
}
