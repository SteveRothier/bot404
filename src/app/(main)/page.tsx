import { FeedRealtimeLazy } from "@/components/feed/FeedRealtimeLazy";
import { FeedSection } from "@/components/feed/FeedSection";
import { HomeFeedLoader } from "@/components/feed/HomeFeedLoader";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { getRequestAuth } from "@/lib/queries/auth";
import { getCachedActiveWorldEvents } from "@/lib/queries/cached";

export const revalidate = 60;

export default async function HomePage() {
  const referenceNowMs = Date.now();
  const [auth, activeEvents] = await Promise.all([
    getRequestAuth(),
    getCachedActiveWorldEvents(),
  ]);
  const activeWorldEvent = activeEvents[0] ?? null;

  return (
    <FeedRealtimeLazy>
      <FeedSection
        user={auth.user}
        profile={auth.profile}
        activeWorldEvent={activeWorldEvent}
      >
        <PostsSuspense>
          <HomeFeedLoader auth={auth} referenceNowMs={referenceNowMs} />
        </PostsSuspense>
      </FeedSection>
    </FeedRealtimeLazy>
  );
}
