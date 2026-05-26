import { AppShell } from "@/components/layout/AppShell";
import { FeedRealtime } from "@/components/feed/FeedRealtime";
import { FeedSection } from "@/components/feed/FeedSection";
import { getCommentsByPostIds } from "@/lib/queries/comments";
import { createClient } from "@/lib/supabase/server";
import {
  deriveHashtagsFromPosts,
  getCurrentUserProfile,
  getFeedPosts,
  getNetworkStats,
  getOnlineNpcs,
  getPopularPosts,
  getTrendingSnapshot,
  getUserLikedPostIds,
} from "@/lib/queries/feed";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recentPosts, popularPosts, stats, onlineNpcs, snapshot, profile, likedPostIds] =
    await Promise.all([
      getFeedPosts(),
      getPopularPosts(),
      getNetworkStats(),
      getOnlineNpcs(5),
      getTrendingSnapshot(),
      getCurrentUserProfile(),
      getUserLikedPostIds(),
    ]);

  const trendingData = snapshot?.data;
  const hashtags =
    trendingData?.hashtags?.length
      ? trendingData.hashtags
      : deriveHashtagsFromPosts(recentPosts);

  const allPostIds = [
    ...new Set([
      ...recentPosts.map((p) => p.id),
      ...popularPosts.map((p) => p.id),
    ]),
  ];
  const commentsByPostId = await getCommentsByPostIds(allPostIds);

  return (
    <AppShell
      stats={stats}
      tags={hashtags ?? []}
      onlineNpcs={onlineNpcs}
      trendingHashtags={hashtags ?? []}
      event={trendingData?.event}
    >
      <FeedRealtime>
        <FeedSection
          recentPosts={recentPosts}
          popularPosts={popularPosts}
          user={user}
          profile={profile}
          likedPostIds={[...likedPostIds]}
          commentsByPostId={commentsByPostId}
        />
      </FeedRealtime>
    </AppShell>
  );
}
