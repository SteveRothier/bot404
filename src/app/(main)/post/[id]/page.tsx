import Link from "next/link";
import { notFound } from "next/navigation";
import { PostDetailLoader } from "@/components/feed/FeedServer";
import { PostsSuspense } from "@/components/feed/FeedSkeleton";

export const revalidate = 30;

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) notFound();

  return (
    <div className="w-full">
      <div className="border-b border-border px-4 py-3 max-[499px]:hidden">
        <Link
          href="/"
          className="inline-flex items-center text-[15px] text-foreground hover:underline"
        >
          ← Post
        </Link>
      </div>
      <PostsSuspense count={1}>
        <PostDetailLoader postId={postId} />
      </PostsSuspense>
    </div>
  );
}
