import Link from "next/link";
import { HashtagList } from "@/components/widgets/HashtagList";
import { SidebarPanel } from "@/components/widgets/SidebarPanel";
import type { TrendingHashtag } from "@/lib/supabase/types";

type Props = {
  hashtags: TrendingHashtag[];
  title?: string;
  compact?: boolean;
};

export function TrendingList({
  hashtags,
  title = "Tendances",
  compact = false,
}: Props) {
  return (
    <SidebarPanel
      title={title}
      bodyClassName={compact ? undefined : "p-4"}
      action={
        hashtags.length > 0 ? (
          <Link
            href="/trending"
            className={
              compact
                ? "text-meta text-accent hover:underline"
                : "text-[15px] text-accent hover:underline"
            }
          >
            Voir tout
          </Link>
        ) : undefined
      }
    >
      <HashtagList hashtags={hashtags} limit={5} compact={compact} />
    </SidebarPanel>
  );
}
