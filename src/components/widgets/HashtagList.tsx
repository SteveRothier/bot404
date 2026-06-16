import Link from "next/link";
import { formatCount } from "@/lib/format";
import { hashtagSearchHref } from "@/lib/hashtags";
import type { TrendingHashtag } from "@/lib/supabase/types";

type Props = {
  hashtags: TrendingHashtag[];
  limit?: number;
  emptyMessage?: string;
  /** Liste dense pour la sidebar */
  compact?: boolean;
};

export function HashtagList({
  hashtags,
  limit,
  emptyMessage = "Aucun hashtag pour l'instant.",
  compact = false,
}: Props) {
  const items = limit ? hashtags.slice(0, limit) : hashtags;

  if (items.length === 0) {
    return (
      <p
        className={
          compact
            ? "text-meta text-muted-foreground"
            : "text-[15px] leading-relaxed text-muted-foreground"
        }
      >
        {emptyMessage}
      </p>
    );
  }

  if (compact) {
    return (
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <Link
            key={item.tag}
            href={hashtagSearchHref(item.tag)}
            className="surface-hover flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
          >
            <span className="min-w-0 truncate text-meta font-medium text-foreground">
              {item.tag}
            </span>
            <span className="shrink-0 text-meta tabular-nums text-muted-foreground">
              {formatCount(item.count)} · #{i + 1}
            </span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <Link
          key={item.tag}
          href={hashtagSearchHref(item.tag)}
          className="surface-hover flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-foreground">
              {item.tag}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {formatCount(item.count)} utilisation
              {item.count > 1 ? "s" : ""}
            </p>
          </div>
          <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
            #{i + 1}
          </span>
        </Link>
      ))}
    </div>
  );
}
