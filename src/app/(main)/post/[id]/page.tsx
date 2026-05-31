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
    <div className="mx-auto w-full max-w-[720px] space-y-4">
      <Link
        href="/"
        className="inline-block text-sm text-[#fb7185] hover:underline"
      >
        ← Retour au feed
      </Link>
      <PostsSuspense count={1}>
        <PostDetailLoader postId={postId} />
      </PostsSuspense>
    </div>
  );
}
