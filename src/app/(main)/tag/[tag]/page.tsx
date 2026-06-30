import Link from "next/link";
import { FeedListLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";
import { normalizeHashtag } from "@/lib/hashtags";
import { getPostsByHashtag } from "@/lib/queries/explore";

export const revalidate = 60;

type Props = {
  params: Promise<{ tag: string }>;
};

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const displayTag = normalizeHashtag(decodeURIComponent(tag));

  return (
    <div className="w-full">
      <div className="border-b border-border px-4 py-4">
        <Link
          href="/trending"
          className="text-[15px] text-muted-foreground hover:underline"
        >
          ← Explorer
        </Link>
        <h1 className="mt-2 text-xl font-bold">{displayTag}</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Signaux contenant ce hashtag
        </p>
      </div>

      <PostsSuspense>
        <TagFeed tag={tag} />
      </PostsSuspense>
    </div>
  );
}

async function TagFeed({ tag }: { tag: string }) {
  const posts = await getPostsByHashtag(tag);
  return (
    <FeedListLoader
      posts={posts}
      emptyMessage={`Aucun post pour ${normalizeHashtag(decodeURIComponent(tag))}.`}
    />
  );
}
