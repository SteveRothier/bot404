import { FeedRealtime } from "@/components/feed/FeedRealtime";
import { FeedPosts, FeedSection } from "@/components/feed/FeedSection";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { getRequestAuth } from "@/lib/queries/auth";
import { getRecentlyUnlockedArchives } from "@/lib/queries/archives";
import { getHomeFeedBundle } from "@/lib/queries/feed";
import { getActiveWorldEvents } from "@/lib/queries/world-events";
import type { Profile } from "@/lib/supabase/types";

export const revalidate = 60;

type HomeFeedPostsProps = {
  referenceNowMs: number;
  user: { id: string; email?: string } | null;
  profile: Profile | null;
};

async function HomeFeedPosts({
  referenceNowMs,
  user,
  profile,
}: HomeFeedPostsProps) {
  const auth = { user, profile };
  const data = await getHomeFeedBundle(auth);

  return (
    <FeedPosts
      {...data}
      user={user}
      profile={profile}
      referenceNowMs={referenceNowMs}
    />
  );
}

export default async function HomePage() {
  const referenceNowMs = Date.now();
  const [{ user, profile }, activeEvents, recentArchives] = await Promise.all([
    getRequestAuth(),
    getActiveWorldEvents(),
    getRecentlyUnlockedArchives(168),
  ]);

  const activeWorldEvent = activeEvents[0] ?? null;
  const recentArchive = recentArchives[0] ?? null;

  return (
    <FeedRealtime>
      <FeedSection
        user={user}
        profile={profile}
        activeWorldEvent={activeWorldEvent}
        recentArchive={recentArchive}
      >
        <PostsSuspense>
          <HomeFeedPosts
            referenceNowMs={referenceNowMs}
            user={user}
            profile={profile}
          />
        </PostsSuspense>
      </FeedSection>
    </FeedRealtime>
  );
}
