"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Film,
  Image,
  Smile,
  TriangleAlert,
} from "lucide-react";
import { createComment } from "@/app/actions/posts";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentDeleteButton } from "@/components/feed/CommentDeleteButton";
import { PostContent } from "@/components/feed/PostContent";
import { formatRelativeTimeShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CommentWithAuthor, Profile } from "@/lib/supabase/types";

type Props = {
  postId: number;
  replyToUsername: string;
  comments: CommentWithAuthor[];
  isLoggedIn: boolean;
  profile?: Profile | null;
  userId?: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  referenceNowMs?: number;
};

const toolbarIcons = [
  { Icon: Image, label: "Image" },
  { Icon: Film, label: "GIF" },
  { Icon: BarChart3, label: "Sondage" },
  { Icon: Smile, label: "Emoji" },
  { Icon: TriangleAlert, label: "Alerte" },
  { Icon: Calendar, label: "Calendrier" },
] as const;

export function PostComments({
  postId,
  replyToUsername,
  comments,
  isLoggedIn,
  profile,
  userId,
  open,
  onOpenChange,
  referenceNowMs = Date.now(),
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const replyAvatar =
    profile?.avatar_url ??
    (userId
      ? `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${userId}`
      : undefined);

  const replyHandle = `@${replyToUsername.toLowerCase()}`;
  const canSubmit = content.trim().length > 0 && !pending;

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      setContent("");
      setError(null);
    }
  }, [open]);

  function expandComposer() {
    setExpanded(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function collapseIfEmpty() {
    if (!content.trim()) setExpanded(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    const fd = new FormData();
    fd.set("content", content.trim());
    startTransition(async () => {
      const result = await createComment(postId, fd);
      if (result.error) setError(result.error);
      else {
        setContent("");
        setExpanded(false);
        onOpenChange?.(true);
      }
    });
  }

  if (!open) return null;

  return (
    <div className="mt-3 border-t border-[#24101a]">
      <div className="border-b border-[#24101a] py-3">
        {isLoggedIn ? (
          <form onSubmit={handleSubmit}>
            <div ref={composerRef}>
              {expanded && (
                <p className="mb-2 text-sm text-[#6b7280]">
                  Répondre à{" "}
                  <span className="text-[#fb7185]">{replyHandle}</span>
                </p>
              )}

              <div className="flex items-start gap-3">
                <Avatar className="size-10 shrink-0 rounded-lg after:rounded-lg">
                  <AvatarImage
                    src={replyAvatar}
                    className="rounded-lg object-cover"
                  />
                  <AvatarFallback className="rounded-lg bg-[#1a0c16] text-xs text-[#fda4af]">
                    {profile?.username?.slice(0, 2) ?? "??"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  {!expanded ? (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={expandComposer}
                        className="flex-1 py-2 text-left text-[15px] text-[#6b7280] hover:text-[#9ca3af]"
                      >
                        Poster votre réponse
                      </button>
                      <button
                        type="button"
                        disabled
                        className="h-8 shrink-0 rounded-full bg-[#1f2937] px-4 text-sm font-bold text-[#4b5563]"
                      >
                        Répondre
                      </button>
                    </div>
                  ) : (
                    <>
                      <Textarea
                        ref={textareaRef}
                        name="content"
                        placeholder="Poster votre réponse"
                        maxLength={300}
                        disabled={pending}
                        rows={3}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onBlur={() => {
                          window.setTimeout(collapseIfEmpty, 120);
                        }}
                        className="min-h-[72px] resize-none border-0 bg-transparent px-0 py-1 text-[15px] text-foreground shadow-none placeholder:text-[#6b7280] focus-visible:border-0 focus-visible:ring-0"
                      />

                      <div className="mt-2 flex items-center justify-between border-t border-[#24101a] pt-2">
                        <div className="flex items-center gap-3 text-[#6b7280]">
                          {toolbarIcons.map(({ Icon, label }) => (
                            <button
                              key={label}
                              type="button"
                              disabled
                              title="Bientôt"
                              className="transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={label}
                            >
                              <Icon className="size-[18px]" strokeWidth={1.75} />
                            </button>
                          ))}
                        </div>
                        <button
                          type="submit"
                          disabled={!canSubmit}
                          onMouseDown={(e) => e.preventDefault()}
                          className={cn(
                            "h-8 rounded-full px-4 text-sm font-bold transition-colors",
                            canSubmit
                              ? "bg-[#e11d48] text-white hover:bg-[#be123c]"
                              : "cursor-not-allowed bg-[#1f2937] text-[#4b5563]"
                          )}
                        >
                          {pending ? "..." : "Répondre"}
                        </button>
                      </div>
                    </>
                  )}

                  {error && (
                    <p className="mt-1 text-xs text-destructive">{error}</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-sm text-[#6b7280]">
            <Link
              href="/login"
              className="font-medium text-[#fb7185] hover:underline"
            >
              Connectez-vous
            </Link>{" "}
            pour répondre.
          </p>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="py-3 text-sm text-[#6b7280]">
          Aucun commentaire pour l&apos;instant.
        </p>
      ) : (
        <div className="divide-y divide-[#24101a]">
          {comments.map((c) => {
            const handle = `@${c.author.username.toLowerCase()}`;
            return (
              <article
                key={c.id}
                className="flex cursor-default items-start gap-3 py-3 transition-colors hover:bg-[#11141f]"
              >
                <Link
                  href={`/profile/${c.author.username}`}
                  className="shrink-0 cursor-pointer self-start"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Avatar className="size-10 rounded-lg after:rounded-lg">
                    <AvatarImage
                      src={c.author.avatar_url ?? undefined}
                      alt={c.author.username}
                      className="rounded-lg object-cover"
                    />
                    <AvatarFallback className="rounded-lg bg-[#1a0c16] text-xs text-[#fda4af]">
                      {c.author.username.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/profile/${c.author.username}`}
                      className="cursor-pointer font-bold text-foreground hover:text-[#fda4af]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.author.username}
                    </Link>
                    {c.author.is_npc ? (
                      <Badge className="h-5 rounded border-0 bg-[#5b21b6] px-1.5 text-[10px] font-bold uppercase text-white hover:bg-[#5b21b6]">
                        NPC
                      </Badge>
                    ) : (
                      <Badge className="h-5 rounded border-0 bg-[#e11d48] px-1.5 text-[10px] font-bold uppercase text-white hover:bg-[#e11d48]">
                        Humain
                      </Badge>
                    )}
                    <span className="text-sm text-[#6b7280]">{handle}</span>
                    <span className="text-sm text-[#6b7280]">·</span>
                    <span className="text-sm text-[#6b7280]">
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
