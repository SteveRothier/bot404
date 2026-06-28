"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MessageCircle, Sparkles } from "lucide-react";
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

type SuccessState = {
  type: "post" | "comment";
  generated: number;
  author: string;
  postId: number;
  pollVotes?: number;
};

type CountPickerProps = {
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  compact: boolean;
  label: string;
  onChange: (value: number) => void;
};

function LoadingDots({ compact }: { compact: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "rounded-full bg-current animate-bounce",
            compact ? "size-1" : "size-1.5"
          )}
          style={{
            animationDelay: `${index * 140}ms`,
            animationDuration: "0.9s",
          }}
        />
      ))}
    </span>
  );
}

function NpcBatchCountPicker({
  value,
  min,
  max,
  disabled,
  compact,
  label,
  onChange,
}: CountPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const optionHeight = compact ? 28 : 34;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const spacing = 4;
    const margin = 8;
    const menuHeight = options.length * optionHeight;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const placeAbove = spaceBelow < menuHeight;

    setMenuStyle({
      top: placeAbove
        ? Math.max(margin, rect.top - menuHeight - spacing)
        : rect.bottom + spacing,
      left: rect.right - rect.width,
      width: rect.width,
    });
  }, [optionHeight, options.length]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    updateMenuPosition();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const triggerClass = cn(
    "flex h-full w-full items-center justify-center gap-0.5 rounded-lg border border-border bg-background/90 font-medium tabular-nums text-foreground transition-colors",
    "hover:bg-secondary/40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    "disabled:cursor-not-allowed disabled:opacity-50",
    compact
      ? "min-w-[2.75rem] px-2 py-1.5 text-meta"
      : "min-w-[3rem] px-3 py-2 text-[15px]"
  );

  const optionClass = (n: number) =>
    cn(
      "flex w-full items-center justify-center px-2 transition-colors hover:bg-secondary",
      compact ? "h-7 text-meta font-medium" : "h-[34px] text-[15px] font-medium",
      value === n && "bg-secondary/80 text-accent"
    );

  const menu =
    mounted && open
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label={label}
            className="fixed z-[300] m-0 list-none overflow-hidden rounded-md border border-border bg-background p-0 shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
            style={menuStyle}
          >
            {options.map((n) => (
              <li key={n} role="presentation" className="m-0 p-0">
                <button
                  type="button"
                  role="option"
                  aria-selected={value === n}
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                  className={optionClass(n)}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative shrink-0 self-stretch",
        compact ? "w-[2.75rem]" : "w-12"
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={triggerClass}
      >
        <span>{value}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
            compact ? "size-3" : "size-3.5"
          )}
          strokeWidth={2}
        />
      </button>
      {menu}
    </div>
  );
}

export function NpcGeneratePanel({ compact = false }: Props) {
  const router = useRouter();
  const online = useOllamaStore((s) => s.online);
  const refresh = useOllamaStore((s) => s.refresh);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [postCount, setPostCount] = useState(1);
  const [commentCount, setCommentCount] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [pendingKind, setPendingKind] = useState<"post" | "comment" | null>(
    null
  );
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
    action: (count: number) => Promise<{
      error?: string;
      success?: boolean;
      generated?: number;
      author?: string;
      postId?: number;
      pollVotes?: number;
    }>,
    kind: "post" | "comment",
    count: number
  ) {
    setError(null);
    setSuccess(null);
    setPendingKind(kind);
    startTransition(async () => {
      try {
        const isOnline = online || (await refresh());
        if (!isOnline) {
          setError("Ollama est hors ligne.");
          return;
        }

        const result = await action(count);
        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.success && result.author && result.postId) {
          setSuccess({
            type: kind,
            generated: result.generated ?? 1,
            author: result.author,
            postId: result.postId,
            pollVotes: result.pollVotes,
          });
          router.refresh();
        }
      } finally {
        setPendingKind(null);
      }
    });
  }

  const disabled = isPending || !online;
  const isPostLoading = pendingKind === "post";
  const isCommentLoading = pendingKind === "comment";

  const btnBase = compact
    ? "flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-2 py-1.5 text-meta font-medium transition-colors"
    : "flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-[15px] font-medium transition-colors";

  const btnPrimary = compact
    ? cn(
        btnBase,
        "font-bold",
        isPostLoading && "relative overflow-hidden",
        !disabled
          ? "border-transparent bg-accent text-accent-foreground hover:bg-accent/90"
          : "cursor-not-allowed bg-secondary text-muted-foreground"
      )
    : cn(
        btnBase,
        isPostLoading && "relative overflow-hidden",
        !disabled
          ? "border-transparent bg-accent text-accent-foreground hover:bg-accent/90"
          : "cursor-not-allowed bg-secondary text-muted-foreground"
      );

  const btnSecondary = compact
    ? cn(
        btnBase,
        isCommentLoading && "relative overflow-hidden",
        !disabled
          ? "border-border bg-transparent text-foreground hover:bg-secondary/80"
          : "cursor-not-allowed bg-secondary/50 text-muted-foreground"
      )
    : cn(
        btnBase,
        isCommentLoading && "relative overflow-hidden",
        !disabled
          ? "bg-secondary text-foreground hover:bg-secondary/80"
          : "cursor-not-allowed bg-secondary/50 text-muted-foreground"
      );

  const iconSize = compact ? "size-3.5" : "size-4";
  const rowClass = compact
    ? "flex items-stretch gap-1.5"
    : "flex items-stretch gap-2";

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

      <div className={rowClass}>
        <button
          type="button"
          onClick={() => run(generateNpcPostAction, "post", postCount)}
          disabled={disabled}
          aria-busy={isPostLoading}
          className={btnPrimary}
        >
          {isPostLoading && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full skeleton-shimmer opacity-35"
            />
          )}
          <Sparkles
            className={cn(iconSize, "relative z-[1]", isPostLoading && "animate-pulse")}
            strokeWidth={1.75}
          />
          <span className="relative z-[1]">
            {isPostLoading ? (
              <LoadingDots compact={compact} />
            ) : compact ? (
              "Post"
            ) : (
              "Générer un post"
            )}
          </span>
        </button>
        <NpcBatchCountPicker
          label="Nombre de posts à générer"
          value={postCount}
          min={1}
          max={5}
          disabled={disabled}
          compact={compact}
          onChange={setPostCount}
        />
      </div>

      <div className={rowClass}>
        <button
          type="button"
          onClick={() => run(generateNpcCommentAction, "comment", commentCount)}
          disabled={disabled}
          aria-busy={isCommentLoading}
          className={btnSecondary}
        >
          {isCommentLoading && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full skeleton-shimmer opacity-40"
            />
          )}
          <MessageCircle
            className={cn(
              iconSize,
              "relative z-[1]",
              isCommentLoading && "animate-pulse"
            )}
            strokeWidth={1.75}
          />
          <span className="relative z-[1]">
            {isCommentLoading ? (
              <LoadingDots compact={compact} />
            ) : compact ? (
              "Commentaire"
            ) : (
              "Générer un commentaire"
            )}
          </span>
        </button>
        <NpcBatchCountPicker
          label="Nombre de commentaires à générer"
          value={commentCount}
          min={1}
          max={10}
          disabled={disabled}
          compact={compact}
          onChange={setCommentCount}
        />
      </div>

      {error && (
        <p
          className={cn(
            "text-center text-destructive",
            compact ? "text-meta" : "text-xs"
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
          {success.generated > 1
            ? `${success.generated} ${success.type === "post" ? "posts" : "commentaires"}`
            : success.type === "post"
              ? "Post"
              : "Commentaire"}{" "}
          par @{success.author}
          {success.type === "comment" && (success.pollVotes ?? 0) > 0
            ? ` · ${success.pollVotes} vote${success.pollVotes === 1 ? "" : "s"} sondage`
            : ""}
          .{" "}
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
