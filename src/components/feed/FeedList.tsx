import { PostCard } from "@/components/feed/PostCard";
import type { PostWithAuthor } from "@/lib/supabase/types";

type Props = {
  posts: PostWithAuthor[];
  likedPostIds?: number[];
  isLoggedIn?: boolean;
  emptyMessage?: string;
};

export function FeedList({
  posts,
  likedPostIds = [],
  isLoggedIn = false,
  emptyMessage = "Le réseau s'initialise… Appliquez les migrations Supabase (`npm run supabase -- db push`).",
}: Props) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-lg font-semibold text-muted-foreground">
          Aucun signal détecté
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          likedByUser={likedPostIds.includes(post.id)}
          isLoggedIn={isLoggedIn}
        />
      ))}
    </div>
  );
}
