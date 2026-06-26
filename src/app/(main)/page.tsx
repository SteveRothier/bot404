import { Suspense } from "react";
import { FeedRealtimeLazy } from "@/components/feed/FeedRealtimeLazy";
import { FeedSectionShell } from "@/components/feed/FeedSectionShell";
import { HomeFeedLoader } from "@/components/feed/HomeFeedLoader";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { getRequestAuth } from "@/lib/queries/shell";
import { parseFeedTabParam } from "@/lib/feed/feed-tab-params";

export const revalidate = 0;

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { tab: tabParam } = await searchParams;
  const initialTab = parseFeedTabParam(tabParam);
  const referenceNowMs = Date.now();
  const auth = await getRequestAuth();

  return (
    <FeedRealtimeLazy>
      <Suspense fallback={null}>
        <FeedSectionShell
          user={auth.user}
          profile={auth.profile}
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
