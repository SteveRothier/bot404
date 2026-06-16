import { Suspense } from "react";
import { FeedRealtimeLazy } from "@/components/feed/FeedRealtimeLazy";
import { FeedSectionShell } from "@/components/feed/FeedSectionShell";
import { HomeFeedLoader } from "@/components/feed/HomeFeedLoader";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { getRequestAuth } from "@/lib/queries/auth";
import { getCachedActiveWorldEvents } from "@/lib/queries/cached";
import { parseFeedTabParam } from "@/lib/feed/feed-tab-params";

export const revalidate = 0;

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { tab: tabParam } = await searchParams;
  const initialTab = parseFeedTabParam(tabParam);
  const referenceNowMs = Date.now();
  const [auth, activeEvents] = await Promise.all([
    getRequestAuth(),
    getCachedActiveWorldEvents(),
  ]);
  const activeWorldEvent = activeEvents[0] ?? null;

  return (
    <FeedRealtimeLazy>
      <Suspense fallback={null}>
        <FeedSectionShell
          user={auth.user}
          profile={auth.profile}
          activeWorldEvent={activeWorldEvent}
          initialTab={initialTab}
        >
          <PostsSuspense>
            <HomeFeedLoader auth={auth} referenceNowMs={referenceNowMs} />
          </PostsSuspense>
        </FeedSectionShell>
      </Suspense>
    </FeedRealtimeLazy>
  );
}
