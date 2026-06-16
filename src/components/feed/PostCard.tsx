"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { BookmarkButton } from "@/components/feed/BookmarkButton";
import { PostReactions } from "@/components/feed/PostReactions";
import { PostCardMenu } from "@/components/feed/PostCardMenu";
import { PostContent } from "@/components/feed/PostContent";
import { UserAvatar } from "@/components/ui/user-avatar";
import { PostMedia } from "@/components/feed/PostMedia";
import { PostPoll } from "@/components/feed/PostPoll";
import dynamic from "next/dynamic";
import { PostCommentsSkeleton } from "@/components/feed/PostCommentsSkeleton";

const PostComments = dynamic(
  () =>
    import("@/components/feed/PostComments").then((m) => m.PostComments),
  { ssr: false, loading: () => <PostCommentsSkeleton /> }
);
import { avatarFallbackSeed } from "@/lib/avatars";
import { formatCount, formatRelativeTimeShort } from "@/lib/format";
import { isPollExpired } from "@/lib/polls";
import { POST_TYPE_LABELS } from "@/lib/post-types";
import { NARRATIVE_COPY } from "@/lib/narrative/copy";
import { cn } from "@/lib/utils";
import type {
  CommentWithAuthor,
  PostWithAuthor,
  Profile,
  ReactionKind,
} from "@/lib/supabase/types";

type Props = {
  post: PostWithAuthor;
  bookmarkedByUser?: boolean;
  userReaction?: ReactionKind | null;
  isLoggedIn?: boolean;
  profile?: Profile | null;
  userId?: string;
  comments?: CommentWithAuthor[];
  referenceNowMs?: number;
  defaultCommentsOpen?: boolean;
};

export function PostCard({
  post,
  bookmarkedByUser = false,
  userReaction = null,
  isLoggedIn = false,
  profile = null,
  userId,
  comments = [],
  referenceNowMs = Date.now(),
  defaultCommentsOpen = false,
}: Props) {
  const router = useRouter();
  const { author } = post;
  const typeLabel = POST_TYPE_LABELS[post.post_type ?? "message"];
  const handle = `@${author.username.toLowerCase()}`;
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const canDelete = isLoggedIn && userId === post.author_id;
  const canClosePoll =
    canDelete &&
    !!post.poll &&
    post.poll.options.length > 0 &&
    !isPollExpired(post.poll.ends_at, referenceNowMs);

  function handleCommentsClick() {
    setCommentsOpen((v) => !v);
  }

  return (
    <article
      className={cn(
        "surface-hover cursor-default px-4 py-3",
        !author.is_npc && "border-l-2 border-accent/30 pl-3",
        post.isRecentNarrativeResponse &&
          "ring-2 ring-violet-500/30 ring-offset-0"
      )}
    >
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${author.username}`}
          className="shrink-0 self-start"
          onClick={(e) => e.stopPropagation()}
        >
          <UserAvatar
            avatarUrl={author.avatar_url}
            fallbackSeed={avatarFallbackSeed(author)}
            username={author.username}
            className="size-10 rounded-lg"
            imageClassName="rounded-lg object-cover"
            fallbackClassName="rounded-lg bg-transparent"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-[15px] leading-5">
              <Link
                href={`/profile/${author.username}`}
                className="truncate font-bold text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {author.username}
              </Link>
              <span className="truncate text-muted-foreground">{handle}</span>
              {author.is_npc && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-meta text-muted-foreground">npc</span>
                </>
              )}
              {author.faction && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span
                    className="text-meta"
                    style={{ color: author.faction.color }}
                  >
                    {author.faction.name}
                  </span>
                </>
              )}
              {typeLabel && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-meta text-muted-foreground">
                    {typeLabel}
                  </span>
                </>
              )}
              {post.narrative_signal_id && author.is_npc && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-meta text-violet-600 dark:text-violet-400">
                    {NARRATIVE_COPY.commentBadge}
                  </span>
                </>
              )}
              <span className="text-muted-foreground">·</span>
              <Link
                href={`/post/${post.id}`}
                className="text-meta text-muted-foreground hover:underline"
              >
                {formatRelativeTimeShort(post.created_at, referenceNowMs)}
              </Link>
            </div>
            <PostCardMenu
              postId={post.id}
              canDelete={canDelete}
              canClosePoll={canClosePoll}
            />
          </div>

          {defaultCommentsOpen ? (
            <PostContent
              content={post.content}
              postType={post.post_type}
              mediaUrl={post.media_url}
              className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground"
            />
          ) : (
            <div
              className="mt-1 block cursor-pointer"
              role="link"
              tabIndex={0}
              aria-label={`Voir le post de ${author.username}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) return;
                router.push(`/post/${post.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/post/${post.id}`);
                }
              }}
            >
              <PostContent
                content={post.content}
                postType={post.post_type}
                mediaUrl={post.media_url}
                className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground"
              />
            </div>
          )}

          {post.media_url && (
            <PostMedia url={post.media_url} mediaType={post.media_type} />
          )}

          {post.poll && post.poll.options.length > 0 && (
            <PostPoll
              poll={post.poll}
              postId={post.id}
              isLoggedIn={isLoggedIn}
              referenceNowMs={referenceNowMs}
            />
          )}

          <div className="mt-3 flex max-w-[425px] justify-between text-muted-foreground">
            <button
              type="button"
              onClick={handleCommentsClick}
              aria-expanded={commentsOpen}
              aria-label="Commentaires"
              className={cn(
                "group flex items-center gap-1.5 text-sm transition-colors hover:text-accent",
                commentsOpen && "text-accent"
              )}
            >
              <MessageCircle className="size-[18px]" strokeWidth={1.75} />
              <span>{formatCount(post.comment_count ?? 0)}</span>
            </button>
            <PostReactions
              postId={post.id}
              relayCount={post.relay_count ?? 0}
              amplifyCount={post.amplify_count ?? 0}
              flagCount={post.flag_count ?? 0}
              userReaction={userReaction}
              isLoggedIn={isLoggedIn}
            />
            <BookmarkButton
              postId={post.id}
              bookmarkedByUser={bookmarkedByUser}
              isLoggedIn={isLoggedIn}
            />
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
