"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, MoreHorizontal, Repeat2, Share } from "lucide-react";
import { LikeButton } from "@/components/feed/LikeButton";
import { PostContent } from "@/components/feed/PostContent";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostComments } from "@/components/feed/PostComments";
import { formatCount, formatRelativeTimeShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CommentWithAuthor, PostWithAuthor, Profile } from "@/lib/supabase/types";

const stubActionClass =
  "flex cursor-not-allowed items-center gap-1.5 text-sm text-[#4b5563] opacity-50";

type Props = {
  post: PostWithAuthor;
  likedByUser?: boolean;
  isLoggedIn?: boolean;
  profile?: Profile | null;
  userId?: string;
  comments?: CommentWithAuthor[];
  referenceNowMs?: number;
  defaultCommentsOpen?: boolean;
};

export function PostCard({
  post,
  likedByUser = false,
  isLoggedIn = false,
  profile = null,
  userId,
  comments = [],
  referenceNowMs = Date.now(),
  defaultCommentsOpen = false,
}: Props) {
  const router = useRouter();
  const { author } = post;
  const handle = `@${author.username.toLowerCase()}`;
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);

  function handleCommentsClick() {
    if (defaultCommentsOpen) {
      setCommentsOpen((v) => !v);
    } else {
      router.push(`/post/${post.id}`);
    }
  }

  return (
    <article className="cursor-default p-4 transition-colors hover:bg-[#11141f]">
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${author.username}`}
          className="shrink-0 cursor-pointer self-start"
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar className="size-12 rounded-lg after:rounded-lg">
            <AvatarImage
              src={author.avatar_url ?? undefined}
              alt={author.username}
              className="rounded-lg object-cover"
            />
            <AvatarFallback className="rounded-lg bg-[#1a0c16] text-xs text-[#fda4af]">
              {author.username.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link
                href={`/profile/${author.username}`}
                className="cursor-pointer truncate font-bold text-foreground hover:text-[#fda4af]"
                onClick={(e) => e.stopPropagation()}
              >
                {author.username}
              </Link>
              {author.is_npc ? (
                <Badge className="h-5 rounded border-0 bg-[#5b21b6] px-1.5 text-[10px] font-bold uppercase text-white hover:bg-[#5b21b6]">
                  NPC
                </Badge>
              ) : (
                <Badge className="h-5 rounded border-0 bg-[#e11d48] px-1.5 text-[10px] font-bold uppercase text-white hover:bg-[#e11d48]">
                  Humain
                </Badge>
              )}
              <span className="truncate text-sm text-[#6b7280]">{handle}</span>
              <span className="text-sm text-[#6b7280]">·</span>
              <Link
                href={`/post/${post.id}`}
                className="text-sm text-[#6b7280] hover:text-[#fb7185]"
              >
                {formatRelativeTimeShort(post.created_at, referenceNowMs)}
              </Link>
            </div>
            <button
              type="button"
              disabled
              title="Bientôt"
              className={cn(stubActionClass, "shrink-0 p-0")}
              aria-label="Options"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>

          {defaultCommentsOpen ? (
            <PostContent
              content={post.content}
              className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground"
            />
          ) : (
            <div
              className="mt-2 block cursor-pointer"
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/post/${post.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/post/${post.id}`);
                }
              }}
            >
              <PostContent
                content={post.content}
                className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground"
              />
            </div>
          )}

          <div className="mt-3 flex max-w-md justify-between text-[#6b7280]">
            <button
              type="button"
              onClick={handleCommentsClick}
              aria-expanded={commentsOpen}
              aria-label="Commentaires"
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors hover:text-[#fb7185]",
                commentsOpen && "text-[#fb7185]"
              )}
            >
              <MessageCircle className="size-[18px]" strokeWidth={1.75} />
              <span>{formatCount(post.comment_count ?? 0)}</span>
            </button>
            <button
              type="button"
              disabled
              title="Bientôt"
              className={stubActionClass}
              aria-label="Reposter"
            >
              <Repeat2 className="size-[18px]" strokeWidth={1.75} />
            </button>
            <LikeButton
              postId={post.id}
              likesCount={post.likes_count}
              likedByUser={likedByUser}
              isLoggedIn={isLoggedIn}
            />
            <button
              type="button"
              disabled
              title="Bientôt"
              className={stubActionClass}
              aria-label="Partager"
            >
              <Share className="size-[18px]" strokeWidth={1.75} />
            </button>
          </div>

          {(commentsOpen || defaultCommentsOpen) && (
            <PostComments
            postId={post.id}
            replyToUsername={author.username}
            comments={comments}
            isLoggedIn={isLoggedIn}
            profile={profile}
            userId={userId}
            open={commentsOpen}
            onOpenChange={setCommentsOpen}
            referenceNowMs={referenceNowMs}
            />
          )}
        </div>
      </div>
    </article>
  );
}
