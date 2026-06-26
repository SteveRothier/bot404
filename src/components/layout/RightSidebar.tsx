import { TrendingList } from "@/components/widgets/TrendingList";
import { NetworkSummary } from "@/components/widgets/NetworkSummary";
import type { ShellNpcSchedule } from "@/lib/queries/shell";
import type { NetworkStats, TrendingHashtag } from "@/lib/supabase/types";

type Props = {
  hashtags: TrendingHashtag[];
  stats: NetworkStats;
  npcSchedule: ShellNpcSchedule;
};

export function RightSidebar({ hashtags, stats, npcSchedule }: Props) {
  return (
    <aside className="sidebar-sticky hidden w-80 shrink-0 flex-col gap-4 xl:flex">
      <TrendingList hashtags={hashtags} compact />
      <NetworkSummary stats={stats} npcSchedule={npcSchedule} />
    </aside>
  );
}
