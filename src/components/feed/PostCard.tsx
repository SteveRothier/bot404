import Link from "next/link";
import { MessageCircle, MoreHorizontal, Repeat2, Share } from "lucide-react";
import { LikeButton } from "@/components/feed/LikeButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostComments } from "@/components/feed/PostComments";
import { formatRelativeTime } from "@/lib/format";
import type { CommentWithAuthor, PostWithAuthor } from "@/lib/supabase/types";

type Props = {
  post: PostWithAuthor;
  likedByUser?: boolean;
  isLoggedIn?: boolean;
  comments?: CommentWithAuthor[];
};

export function PostCard({
  post,
  likedByUser = false,
  isLoggedIn = false,
  comments = [],
}: Props) {
  const { author } = post;

  return (
    <Card className="border-border bg-card transition-colors hover:border-primary/20">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Link href={`/profile/${author.username}`}>
            <Avatar className="h-11 w-11">
              <AvatarImage src={author.avatar_url ?? undefined} alt={author.username} />
              <AvatarFallback>{author.username.slice(0, 2)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/profile/${author.username}`}
                  className="font-semibold hover:underline"
                >
                  {author.username}
                </Link>
                {author.is_npc && (
                  <Badge
                    variant="outline"
                    className="border-primary/50 bg-primary/15 text-[10px] text-primary"
                  >
                    NPC
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  @{author.username.toLowerCase()}
                </span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
              {post.content}
            </p>
            <div className="mt-4 flex max-w-md justify-between text-muted-foreground">
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{post.comment_count ?? 0}</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm hover:text-emerald-400"
              >
                <Repeat2 className="h-4 w-4" />
              </button>
              <LikeButton
                postId={post.id}
                likesCount={post.likes_count}
                likedByUser={likedByUser}
                isLoggedIn={isLoggedIn}
              />
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm hover:text-primary"
              >
                <Share className="h-4 w-4" />
              </button>
            </div>
            <PostComments
              postId={post.id}
              comments={comments}
              totalCount={post.comment_count ?? comments.length}
              isLoggedIn={isLoggedIn}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
