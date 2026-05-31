import { LeftSidebarNav } from "@/components/layout/LeftSidebarNav";
import { NetworkSummary } from "@/components/widgets/NetworkSummary";
import { getCurrentUserProfile } from "@/lib/queries/feed";
import type { NetworkStats } from "@/lib/supabase/types";

type Props = {
  stats: NetworkStats;
};

export async function LeftSidebar({ stats }: Props) {
  const profile = await getCurrentUserProfile();

  return (
    <aside className="sidebar-sticky hidden w-64 shrink-0 lg:flex lg:flex-col lg:gap-4">
      <LeftSidebarNav profileUsername={profile?.username ?? null} />
      <NetworkSummary stats={stats} />
    </aside>
  );
}
