import { Suspense } from "react";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { TrendingEventsSection } from "@/components/trending/TrendingEventsSection";
import { TrendingFeedSection } from "@/components/trending/TrendingFeedSection";
import { TrendingHashtagsSection } from "@/components/trending/TrendingHashtagsSection";
import { TrendingNarrativeSection } from "@/components/trending/TrendingNarrativeSection";

export const revalidate = 60;

export default function TrendingPage() {
  return (
    <div className="w-full divide-y divide-border">
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold">Explorer</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Tendances, rumeurs et théories du réseau
        </p>
      </div>

      <Suspense
        fallback={
          <section className="space-y-4 px-4 py-4">
            <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
          </section>
        }
      >
        <TrendingEventsSection />
      </Suspense>

      <Suspense
        fallback={
          <section className="px-4 py-4">
            <div className="h-20 animate-pulse rounded-xl bg-secondary/50" />
          </section>
        }
      >
        <TrendingNarrativeSection />
      </Suspense>

      <Suspense
        fallback={
          <>
            <section className="px-4 py-4">
              <div className="h-16 animate-pulse rounded-xl bg-secondary/50" />
            </section>
            <section className="px-4 py-4">
              <div className="h-24 animate-pulse rounded-xl bg-secondary/50" />
            </section>
          </>
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
