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
import { useRouter } from "next/navigation";
import { ChevronDown, MessageCircle, Sparkles } from "lucide-react";
import {
  commitNpcCommentAction,
  commitNpcPostAction,
  generateNpcCommentAction,
  generateNpcPostAction,
  prepareNpcCommentAction,
  prepareNpcPostAction,
} from "@/app/actions/npc";
import { ollamaInputFromStore } from "@/lib/ollama-action-input";
import {
  needsClientOllamaBridge,
  effectiveOllamaEndpoint,
  ollamaChatClient,
  toOllamaRuntime,
} from "@/lib/ollama-client";
import type { OllamaChatProfile } from "@/lib/engine/content/ollama";
import { cn } from "@/lib/utils";
import { useOllamaStore } from "@/stores/ollama-store";

type Props = {
  compact?: boolean;
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
  const endpointUrl = useOllamaStore((s) => s.endpointUrl);
  const model = useOllamaStore((s) => s.model);
  const refresh = useOllamaStore((s) => s.refresh);
  const [error, setError] = useState<string | null>(null);
  const [postCount, setPostCount] = useState(1);
  const [commentCount, setCommentCount] = useState(1);
  const [batchProgress, setBatchProgress] = useState<{
    kind: "post" | "comment";
    current: number;
    total: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingKind, setPendingKind] = useState<"post" | "comment" | null>(
    null
  );
  function run(kind: "post" | "comment", count: number) {
    setError(null);
    setPendingKind(kind);
    setBatchProgress({ kind, current: 0, total: count });
    startTransition(async () => {
      try {
        const isOnline = online || (await refresh());
        if (!isOnline) {
          setError("Ollama est hors ligne.");
          return;
        }

        const ollama = ollamaInputFromStore(
          effectiveOllamaEndpoint(endpointUrl),
          model
        );
        const useBridge = needsClientOllamaBridge(endpointUrl, isOnline);
        const runtime = toOllamaRuntime({
          endpointUrl: effectiveOllamaEndpoint(endpointUrl),
          model: model || "qwen3.5:4b",
        });

        const runBridgePost = async (): Promise<boolean> => {
          for (let attempt = 0; attempt < 3; attempt++) {
            const prep = await prepareNpcPostAction();
            if ("error" in prep && prep.error) {
              setError(prep.error);
              return false;
            }
            if (
              !("prepareToken" in prep) ||
              !prep.system ||
              !prep.user ||
              !prep.prepareToken
            ) {
              setError("Préparation du post impossible.");
              return false;
            }

            for (let ollamaAttempt = 0; ollamaAttempt < 3; ollamaAttempt++) {
              const raw = await ollamaChatClient(
                runtime,
                prep.system,
                prep.user,
                500,
                prep.profile as OllamaChatProfile
              );
              if (!raw) continue;

              const result = await commitNpcPostAction(prep.prepareToken, raw);
              if ("success" in result && result.success) return true;
              if ("error" in result && result.error) {
                if (!result.error.includes("filtré")) {
                  setError(result.error);
                  return false;
                }
              }
            }
          }
          setError(
            "Échec après plusieurs tentatives (Ollama ou contenu filtré)."
          );
          return false;
        };

        const runBridgeComment = async (): Promise<boolean> => {
          for (let attempt = 0; attempt < 3; attempt++) {
            const prep = await prepareNpcCommentAction();
            if ("error" in prep && prep.error) {
              setError(prep.error);
              return false;
            }
            if (
              !("prepareToken" in prep) ||
              !prep.system ||
              !prep.user ||
              !prep.prepareToken
            ) {
              setError("Préparation du commentaire impossible.");
              return false;
            }

            for (let ollamaAttempt = 0; ollamaAttempt < 3; ollamaAttempt++) {
              const raw = await ollamaChatClient(
                runtime,
                prep.system,
                prep.user,
                300,
                "comment"
              );
              if (!raw) continue;

              const result = await commitNpcCommentAction(
                prep.prepareToken,
                raw
              );
              if ("success" in result && result.success) return true;
              if ("error" in result && result.error) {
                if (!result.error.includes("filtré")) {
                  setError(result.error);
                  return false;
                }
              }
            }
          }
          setError(
            "Échec après plusieurs tentatives (Ollama ou contenu filtré)."
          );
          return false;
        };

        const runBridgeBatch = async (): Promise<number> => {
          let generated = 0;
          for (let i = 0; i < count; i++) {
            setBatchProgress({ kind, current: i + 1, total: count });
            const ok =
              kind === "post"
                ? await runBridgePost()
                : await runBridgeComment();
            if (!ok) return generated;
            generated += 1;
          }
          return generated;
        };

        let generated = 0;

        if (useBridge) {
          generated = await runBridgeBatch();
        } else {
          const action =
            kind === "post" ? generateNpcPostAction : generateNpcCommentAction;
          let result = await action(count, ollama);

          if ("error" in result && result.error === "CLIENT_BRIDGE") {
            generated = await runBridgeBatch();
          } else if ("error" in result && result.error) {
            setError(result.error);
            return;
          } else if ("success" in result && result.success) {
            generated = result.generated ?? count;
            setBatchProgress({ kind, current: generated, total: count });
          }
        }

        if (generated > 0) {
          router.refresh();
          if (generated < count) {
            setError(
              `${generated}/${count} ${kind === "post" ? "posts" : "commentaires"} générés.`
            );
          }
        } else {
          setError("Aucun contenu généré.");
        }
      } finally {
        setPendingKind(null);
        setBatchProgress(null);
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
      <div className={rowClass}>
        <button
          type="button"
          onClick={() => run("post", postCount)}
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
          onClick={() => run("comment", commentCount)}
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

      {batchProgress && (
        <p
          className={cn(
            "text-center text-muted-foreground",
            compact ? "text-meta" : "text-xs"
          )}
        >
          {batchProgress.kind === "post" ? "Posts" : "Commentaires"}{" "}
          {batchProgress.current}/{batchProgress.total}…
        </p>
      )}

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
    </div>
  );
}
