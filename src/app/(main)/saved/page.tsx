import { redirect } from "next/navigation";
import { FeedListLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { getRequestAuth } from "@/lib/queries/shell";
import { getBookmarkedPosts } from "@/lib/queries/social";

export const revalidate = 30;

async function SavedPosts({
  auth,
}: {
  auth: Awaited<ReturnType<typeof getRequestAuth>>;
}) {
  const posts = await getBookmarkedPosts(auth.user?.id);

  return (
    <FeedListLoader
      posts={posts}
      auth={auth}
      emptyMessage="Aucun post sauvegardé pour l'instant."
    />
  );
}

export default async function SavedPage() {
  const auth = await getRequestAuth();
  if (!auth.profile) {
    redirect("/login");
  }

  return (
    <div className="w-full">
      <div className="border-b border-border px-4 py-4 max-[499px]:hidden">
        <h1 className="text-xl font-bold">Sauvegardés</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Les posts que vous avez mis de côté.
        </p>
      </div>

      <PostsSuspense count={3}>
        <SavedPosts auth={auth} />
      </PostsSuspense>
    </div>
  );
}
