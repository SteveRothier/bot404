import { HomeFeedClient } from "@/components/feed/HomeFeedClient";
import { getHomeFeedTabBundle } from "@/lib/queries/feed";
import type { RequestAuth } from "@/lib/queries/auth";

type Props = {
  auth: RequestAuth;
  referenceNowMs: number;
};

export async function HomeFeedLoader({ auth, referenceNowMs }: Props) {
  const initial = await getHomeFeedTabBundle("for-you", auth);

  return (
    <HomeFeedClient
      recentPosts={initial.posts}
      theoryPosts={[]}
      rumorPosts={[]}
      followingPosts={[]}
      suggestedNpcs={initial.suggestedNpcs}
      user={auth.user}
      profile={auth.profile}
      likedPostIds={initial.likedPostIds}
      bookmarkedPostIds={initial.bookmarkedPostIds}
      commentsByPostId={initial.commentsByPostId}
      userReactionsByPostId={initial.userReactionsByPostId}
      referenceNowMs={referenceNowMs}
    />
  );
}
