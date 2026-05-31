import { TopBarWrapper } from "@/components/layout/TopBarWrapper";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { MobileNavWrapper } from "@/components/layout/MobileNavWrapper";
import type {
  NetworkStats,
  TrendingEvent,
  TrendingHashtag,
} from "@/lib/supabase/types";

type Props = {
  children: React.ReactNode;
  stats: NetworkStats;
  hashtags: TrendingHashtag[];
  event?: TrendingEvent | null;
};

export function AppShell({
  children,
  stats,
  hashtags,
  event,
}: Props) {
  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <TopBarWrapper />
      <div className="mx-auto flex max-w-[1480px] items-start gap-4 px-3 lg:gap-5">
        <LeftSidebar stats={stats} />
        <main className="min-w-0 flex-1 py-4">{children}</main>
        <RightSidebar hashtags={hashtags} event={event} />
      </div>
      <MobileNavWrapper />
    </div>
  );
}
