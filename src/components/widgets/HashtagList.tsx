import Link from "next/link";
import { formatCount } from "@/lib/format";
import { hashtagSearchHref } from "@/lib/hashtags";
import type { TrendingHashtag } from "@/lib/supabase/types";

type Props = {
  hashtags: TrendingHashtag[];
  limit?: number;
  emptyMessage?: string;
};

export function HashtagList({
  hashtags,
  limit,
  emptyMessage = "Aucun hashtag pour l'instant.",
}: Props) {
  const items = limit ? hashtags.slice(0, limit) : hashtags;

  if (items.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-[#6b7280]">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <Link
          key={item.tag}
          href={hashtagSearchHref(item.tag)}
          className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-[#34121b] hover:bg-[#11141f]"
        >
          <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-[#4b5563] group-hover:text-[#fb7185]">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-[#fda4af] group-hover:text-[#fb7185]">
              {item.tag}
            </p>
            <p className="text-[11px] text-[#6b7280]">
              {formatCount(item.count)} utilisation
              {item.count > 1 ? "s" : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[#4c1d2a] bg-[#1a0c16] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#9ca3af]">
            {formatCount(item.count)}
          </span>
        </Link>
      ))}
    </div>
  );
}
