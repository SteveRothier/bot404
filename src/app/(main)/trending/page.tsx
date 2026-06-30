import { Suspense } from "react";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { TrendingFeedSection } from "@/components/trending/TrendingFeedSection";
import { TrendingHashtagsSection } from "@/components/trending/TrendingHashtagsSection";

export const revalidate = 60;

export default function TrendingPage() {
  return (
    <div className="w-full divide-y divide-border">
      <div className="px-4 py-4 max-[499px]:hidden">
        <h1 className="text-xl font-bold">Explorer</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Tendances et hashtags du réseau
        </p>
      </div>

      <Suspense
        fallback={
          <section className="px-4 py-4">
            <div className="h-16 animate-pulse rounded-xl bg-secondary/50" />
          </section>
        }
      >
        <TrendingHashtagsSection />
      </Suspense>

      <PostsSuspense count={2}>
        <Suspense
          fallback={
            <section className="px-4 py-4">
              <div className="h-32 animate-pulse rounded-xl bg-secondary/50" />
            </section>
          }
        >
          <TrendingFeedSection />
        </Suspense>
      </PostsSuspense>
    </div>
  );
}
