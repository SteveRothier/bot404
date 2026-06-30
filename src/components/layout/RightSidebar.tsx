import { TrendingList } from "@/components/widgets/TrendingList";
import { NetworkSummary } from "@/components/widgets/NetworkSummary";
import type { OllamaDisplayDefaults, ShellNpcSchedule } from "@/lib/queries/shell";
import type { NpcGenerationStatus } from "@/lib/engine/shared/generation-gate";
import type { NetworkStats, TrendingHashtag } from "@/lib/supabase/types";

type Props = {
  hashtags: TrendingHashtag[];
  stats: NetworkStats;
  npcSchedule: ShellNpcSchedule;
  npcGeneration: NpcGenerationStatus;
  ollamaDisplay: OllamaDisplayDefaults;
};

export function RightSidebar({
  hashtags,
  stats,
  npcSchedule,
  npcGeneration,
  ollamaDisplay,
}: Props) {
  return (
    <aside className="layout-sidebar-column hidden w-80 flex-col gap-4 pt-3 xl:flex">
      <TrendingList hashtags={hashtags} compact />
      <NetworkSummary
        stats={stats}
        npcSchedule={npcSchedule}
        npcGeneration={npcGeneration}
        ollamaDisplay={ollamaDisplay}
      />
    </aside>
  );
}
