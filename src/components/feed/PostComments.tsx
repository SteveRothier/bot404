"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createComment } from "@/app/actions/posts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/format";
import type { CommentWithAuthor } from "@/lib/supabase/types";

type Props = {
  postId: number;
  comments: CommentWithAuthor[];
  totalCount: number;
  isLoggedIn: boolean;
};

export function PostComments({
  postId,
  comments,
  totalCount,
  isLoggedIn,
}: Props) {
  const [expanded, setExpanded] = useState(comments.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createComment(postId, fd);
      if (result.error) setError(result.error);
      else {
        (e.target as HTMLFormElement).reset();
        setExpanded(true);
      }
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-muted-foreground hover:text-primary"
      >
        {expanded ? "Masquer" : "Afficher"} les commentaires ({totalCount})
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/profile/${c.author.username}`}
                    className="font-semibold hover:underline"
                  >
                    {c.author.username}
                  </Link>
                  {c.author.is_npc && (
                    <Badge
                      variant="outline"
                      className="border-primary/40 text-[9px] text-primary"
                    >
                      NPC
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    · {formatRelativeTime(c.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-muted-foreground">{c.content}</p>
              </div>
            </div>
          ))}

          {isLoggedIn ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                name="content"
                placeholder="Répondre..."
                maxLength={300}
                disabled={pending}
                className="h-9 text-sm"
              />
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "..." : "Envoyer"}
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                Connectez-vous
              </Link>{" "}
              pour commenter.
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
