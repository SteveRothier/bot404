"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchFeedCommentById } from "@/app/actions/feed";
import { createComment } from "@/app/actions/posts";
import { useFeedBridge } from "@/components/feed/FeedBridgeContext";
import { UserAvatar } from "@/components/ui/user-avatar";
import { CommentActions } from "@/components/feed/CommentActions";
import { CommentDeleteButton } from "@/components/feed/CommentDeleteButton";
import { ComposerTextarea } from "@/components/feed/ComposerTextarea";
import { ComposerToolbar } from "@/components/feed/ComposerToolbar";
import { EmbeddedMedia } from "@/components/feed/EmbeddedMedia";
import { PostContent } from "@/components/feed/PostContent";
import { extractEmbedMediaUrls } from "@/lib/embed-media";
import { formatRelativeTimeShort } from "@/lib/format";
import { composerSubmitClassName } from "@/components/feed/composer-styles";
import { avatarFallbackSeed } from "@/lib/avatars";
import { markFeedLiveRefresh } from "@/lib/feed/live-refresh";
import { cn } from "@/lib/utils";
import type { CommentWithAuthor, Profile } from "@/lib/supabase/types";

type Props = {
  postId: number;
  replyToUsername: string;
  comments: CommentWithAuthor[];
  isLoggedIn: boolean;
  profile?: Profile | null;
  userId?: string;
  likedCommentIds?: number[];
  bookmarkedCommentIds?: number[];
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  referenceNowMs?: number;
};

export function PostComments({
  postId,
  replyToUsername,
  comments,
  isLoggedIn,
  profile,
  userId,
  likedCommentIds = [],
  bookmarkedCommentIds = [],
  open,
  onOpenChange,
  referenceNowMs = Date.now(),
}: Props) {
  const router = useRouter();
  const feedBridge = useFeedBridge();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState("");

  const replyHandle = `@${replyToUsername.toLowerCase()}`;
  const composerId = `reply-composer-${postId}`;
  const likedCommentIdSet = new Set(likedCommentIds);
  const bookmarkedCommentIdSet = new Set(bookmarkedCommentIds);
  const embedSourceUrl = extractEmbedMediaUrls(content)[0];
  const canSubmit = content.trim().length > 0 && !pending;

  useEffect(() => {
    if (!open) {
      setContent("");
      setError(null);
    }
  }, [open]);

  function handleGifSelect(gif: { url: string; previewUrl: string }) {
    setContent((c) => {
      const sep = c.length > 0 && !/\s$/.test(c) ? " " : "";
      return `${c}${sep}${gif.url}`;
    });
  }

  function handleReplyToComment(username: string) {
    const mention = `@${username.toLowerCase()} `;
    setContent((prev) => {
      if (prev.includes(mention)) return prev;
      return `${mention}${prev}`.trimStart();
    });
    requestAnimationFrame(() => {
      const el = document.getElementById(composerId);
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    const fd = new FormData();
    fd.set("content", content.trim());
    startTransition(async () => {
      const result = await createComment(postId, fd);
      if ("error" in result) setError(result.error);
      else {
        setContent("");
        onOpenChange?.(true);
        if (result.narrativeQueued) {
          markFeedLiveRefresh();
        }
        if (result.commentId) {
          const comment = await fetchFeedCommentById(result.commentId);
          if (comment) {
            feedBridge.prependComment(postId, comment);
          }
        }
        router.refresh();
      }
    });
  }

  if (!open) return null;

  return (
    <div className="mt-3 border-t border-border">
      <div className="border-b border-border px-0 py-4">
        {isLoggedIn ? (
          <form onSubmit={handleSubmit}>
            <p className="mb-3 px-1 text-[15px] text-muted-foreground">
              Répondre à{" "}
              <Link
                href={`/profile/${replyToUsername}`}
                className="text-accent hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {replyHandle}
              </Link>
            </p>

            <div className="flex items-start gap-3">
              {userId && (
                <UserAvatar
                  avatarUrl={profile?.avatar_url}
                  fallbackSeed={userId}
                  username={profile?.username ?? "??"}
                  className="size-10 shrink-0 rounded-lg"
                  imageClassName="rounded-lg object-cover"
                  fallbackClassName="rounded-lg bg-transparent"
                />
              )}

              <div className="min-w-0 flex-1">
                <ComposerTextarea
                  id={composerId}
                  name="content"
                  placeholder="Ajouter un commentaire"
                  maxLength={300}
                  disabled={pending}
                  value={content}
                  onChange={setContent}
                />

                {embedSourceUrl && (
                  <EmbeddedMedia url={embedSourceUrl} />
                )}

                {error && (
                  <p className="mt-1 px-1 text-sm text-destructive">{error}</p>
                )}

                <div className="mt-1 flex items-center justify-between gap-3 px-1 pb-0.5">
                  <ComposerToolbar
                    onEmojiSelect={(emoji) => setContent((c) => c + emoji)}
                    onGifSelect={handleGifSelect}
                    disabled={pending}
                  />

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    onMouseDown={(e) => e.preventDefault()}
                    className={composerSubmitClassName(canSubmit)}
                  >
                    {pending ? "..." : "Répondre"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-accent hover:underline">
              Connectez-vous
            </Link>{" "}
            pour répondre.
          </p>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          Aucun commentaire pour l&apos;instant.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {comments.map((c) => {
            const handle = `@${c.author.username.toLowerCase()}`;
            return (
              <article
                key={c.id}
                className={cn(
                  "surface-hover flex items-start gap-3 py-3",
                  c.isRecentNarrativeResponse &&
                    "rounded-lg ring-2 ring-violet-500/30"
                )}
              >
                <Link
                  href={`/profile/${c.author.username}`}
                  className="shrink-0 self-start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserAvatar
                    avatarUrl={c.author.avatar_url}
                    fallbackSeed={avatarFallbackSeed(c.author)}
                    username={c.author.username}
                    className="size-10 rounded-lg"
                    imageClassName="rounded-lg object-cover"
                    fallbackClassName="rounded-lg bg-transparent"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1 text-[15px]">
                    <Link
                      href={`/profile/${c.author.username}`}
                      className="font-bold text-foreground hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.author.username}
                    </Link>
                    <span className="text-muted-foreground">{handle}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-meta text-muted-foreground">
                      {formatRelativeTimeShort(c.created_at, referenceNowMs)}
                    </span>
                    <CommentDeleteButton
                      commentId={c.id}
                      postId={postId}
                      canDelete={!!userId && userId === c.author_id}
                    />
                  </div>
                  <PostContent
                    content={c.content}
                    className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground"
                  />
                  <CommentActions
                    commentId={c.id}
                    postId={postId}
                    relayCount={c.relay_count ?? 0}
                    likedByUser={likedCommentIdSet.has(c.id)}
                    bookmarkedByUser={bookmarkedCommentIdSet.has(c.id)}
                    isLoggedIn={isLoggedIn}
                    onReply={() => handleReplyToComment(c.author.username)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
