import { FeedRealtime } from "@/components/feed/FeedRealtime";
import { FeedPosts, FeedSection } from "@/components/feed/FeedSection";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { getCurrentUserProfile, getHomeFeedBundle } from "@/lib/queries/feed";
import { createClient } from "@/lib/supabase/server";
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
  const data = await getHomeFeedBundle();

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getCurrentUserProfile() : null;

  return (
    <FeedRealtime>
      <FeedSection user={user} profile={profile}>
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
