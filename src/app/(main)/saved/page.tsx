import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedListLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { getBookmarkedPosts } from "@/lib/queries/bookmarks";
import { getCurrentUserProfile } from "@/lib/queries/feed";

export const revalidate = 30;

async function SavedPosts() {
  const posts = await getBookmarkedPosts();

  return (
    <FeedListLoader
      posts={posts}
      emptyMessage="Aucun post sauvegardé pour l'instant."
    />
  );
}

export default async function SavedPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sauvegardés</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Les posts que vous avez mis de côté.
        </p>
      </div>

      <PostsSuspense count={3}>
        <SavedPosts />
      </PostsSuspense>

      <Link href="/" className="text-sm text-[#fb7185] hover:underline">
        ← Retour au feed
      </Link>
    </div>
  );
}
