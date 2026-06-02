import { AppSidebarMobile } from "@/components/layout/AppSidebarMobile";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { ClientStoresHydrator } from "@/components/providers/ClientStoresHydrator";
import type { OllamaStatus } from "@/lib/ollama";
import type { ShellNpcSchedule } from "@/lib/queries/shell-data";
import type { Faction, NetworkStats, Profile, TrendingHashtag } from "@/lib/supabase/types";

type SidebarAuth = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  profileUsername: string | null;
};

type Props = {
  children: React.ReactNode;
  stats: NetworkStats;
  hashtags: TrendingHashtag[];
  factions: Faction[];
  npcSchedule: ShellNpcSchedule;
  ollama: OllamaStatus;
  sidebarAuth: SidebarAuth;
  initialUnreadCount: number;
};

export function AppShell({
  children,
  stats,
  hashtags,
  factions,
  npcSchedule,
  ollama,
  sidebarAuth,
  initialUnreadCount,
}: Props) {
  const userId = sidebarAuth.user?.id ?? null;

  return (
    <ClientStoresHydrator
      factions={factions}
      ollama={ollama}
      userId={userId}
      initialUnreadCount={initialUnreadCount}
    >
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-[1280px] items-start gap-6 px-3 lg:gap-8 lg:px-4">
          <LeftSidebar sidebarAuth={sidebarAuth} />

          <div className="flex min-w-0 flex-1 flex-col">
            <AppSidebarMobile
              sidebarAuth={sidebarAuth}
              stats={stats}
              npcSchedule={npcSchedule}
            />
            <main className="min-w-0 flex-1 border-l border-border py-0 lg:max-w-[600px]">
              {children}
            </main>
          </div>

          <RightSidebar
            hashtags={hashtags}
            stats={stats}
            npcSchedule={npcSchedule}
          />
        </div>
      </div>
    </ClientStoresHydrator>
  );
}
