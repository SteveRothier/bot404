"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Sparkles } from "lucide-react";
import {
  generateNpcCommentAction,
  generateNpcPostAction,
  getNpcMediaStatusAction,
} from "@/app/actions/npc";
import { cn } from "@/lib/utils";
import { useOllamaStore } from "@/stores/ollama-store";

type Props = {
  compact?: boolean;
};

type SuccessState =
  | { type: "post"; author: string; postId: number }
  | { type: "comment"; author: string; postId: number };

export function NpcGeneratePanel({ compact = false }: Props) {
  const router = useRouter();
  const online = useOllamaStore((s) => s.online);
  const refresh = useOllamaStore((s) => s.refresh);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [pending, startTransition] = useTransition();
  const [mediaStatus, setMediaStatus] = useState<{
    enabled: boolean;
    gif: boolean;
    steam: boolean;
    ai: boolean;
  } | null>(null);

  useEffect(() => {
    getNpcMediaStatusAction().then(setMediaStatus);
  }, []);

  const mediaLabel = (() => {
    if (!mediaStatus?.enabled) return null;
    const parts: string[] = [];
    if (mediaStatus.gif) parts.push("GIF");
    if (mediaStatus.steam) parts.push("Steam");
    if (mediaStatus.ai) parts.push("Image IA");
    return parts.length > 0 ? parts.join(" · ") : "Médias";
  })();

  function run(
    action: () => Promise<{
      error?: string;
      success?: boolean;
      author?: string;
      postId?: number;
      commentId?: number;
    }>,
    kind: "post" | "comment"
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const isOnline = online || (await refresh());
      if (!isOnline) {
        setError("Ollama est hors ligne.");
        return;
      }

      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success && result.author && result.postId) {
        setSuccess({
          type: kind,
          author: result.author,
          postId: result.postId,
        });
        router.refresh();
      }
    });
  }

  const disabled = pending || !online;

  const btnBase = compact
    ? "flex items-center justify-center gap-1.5 rounded-full border border-border px-2 py-1.5 text-meta font-medium transition-colors"
    : "flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-[15px] font-medium transition-colors";

  const btnPrimary = compact
    ? cn(
        btnBase,
        "w-full font-bold",
        !disabled
          ? "border-transparent bg-accent text-accent-foreground hover:bg-accent/90"
          : "cursor-not-allowed bg-secondary text-muted-foreground"
      )
    : cn(
        "flex w-full items-center justify-center gap-2 rounded-full border border-transparent px-4 py-2.5 text-[15px] font-bold transition-colors",
        !disabled
          ? "bg-accent text-accent-foreground hover:bg-accent/90"
          : "cursor-not-allowed bg-secondary text-muted-foreground"
      );

  const btnSecondary = compact
    ? cn(
        btnBase,
        "w-full",
        !disabled
          ? "border-border bg-transparent text-foreground hover:bg-secondary/80"
          : "cursor-not-allowed bg-secondary/50 text-muted-foreground"
      )
    : cn(
        btnBase,
        !disabled
          ? "bg-secondary text-foreground hover:bg-secondary/80"
          : "cursor-not-allowed bg-secondary/50 text-muted-foreground"
      );

  const iconSize = compact ? "size-3.5" : "size-4";

  return (
    <div className={compact ? "mt-2 grid gap-1.5" : "mt-3 space-y-2"}>
      {mediaLabel && (
        <p
          className={cn(
            "text-center text-muted-foreground",
            compact ? "text-meta" : "text-xs"
          )}
        >
          Médias NPC : {mediaLabel}
        </p>
      )}
      <button
        type="button"
        onClick={() => run(generateNpcPostAction, "post")}
        disabled={disabled}
        className={btnPrimary}
      >
        <Sparkles className={iconSize} strokeWidth={1.75} />
        {pending ? "…" : compact ? "Post" : "Générer un post"}
      </button>

      <button
        type="button"
        onClick={() => run(generateNpcCommentAction, "comment")}
        disabled={disabled}
        className={btnSecondary}
      >
        <MessageCircle className={iconSize} strokeWidth={1.75} />
        {compact ? "Commentaire" : "Générer un commentaire"}
      </button>

      {error && (
        <p
          className={cn(
            "text-center text-destructive",
            compact ? "text-meta col-span-1" : "text-xs"
          )}
        >
          {error}
        </p>
      )}

      {success && (
        <p
          className={cn(
            "text-center text-foreground",
            compact ? "text-meta" : "text-xs"
          )}
        >
          {success.type === "post" ? "Signal" : "Commentaire"} par @
          {success.author}.{" "}
          <Link
            href={`/post/${success.postId}`}
            className="text-accent hover:underline"
          >
            Voir
          </Link>
        </p>
      )}
    </div>
  );
}
