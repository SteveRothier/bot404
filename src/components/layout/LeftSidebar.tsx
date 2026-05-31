import { LeftSidebarNav } from "@/components/layout/LeftSidebarNav";
import { NetworkSummary } from "@/components/widgets/NetworkSummary";
import type { NetworkStats } from "@/lib/supabase/types";

type Props = {
  stats: NetworkStats;
};

export function LeftSidebar({ stats }: Props) {
  return (
    <aside className="sidebar-sticky hidden w-64 shrink-0 lg:flex lg:flex-col lg:gap-4">
      <LeftSidebarNav />
      <NetworkSummary stats={stats} />
    </aside>
  );
}
