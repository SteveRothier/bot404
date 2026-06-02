import { AppSidebarContent } from "@/components/layout/AppSidebarContent";
import { AppSidebarDrawer } from "@/components/layout/AppSidebarDrawer";
import { AppSidebarNetworkMobile } from "@/components/layout/AppSidebarNetworkMobile";
import type { ShellNpcSchedule } from "@/lib/queries/shell-data";
import type { NetworkStats, Profile } from "@/lib/supabase/types";

type SidebarAuth = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  profileUsername: string | null;
};

type Props = {
  sidebarAuth: SidebarAuth;
  stats?: NetworkStats;
  npcSchedule?: ShellNpcSchedule;
};

export function AppSidebarMobile({
  sidebarAuth,
  stats,
  npcSchedule,
}: Props) {
  const { user, profile, profileUsername } = sidebarAuth;

  return (
    <AppSidebarDrawer showNotifications={!!user}>
      <AppSidebarContent
        user={user}
        profile={profile}
        profileUsername={profileUsername}
      />
      {stats && npcSchedule && (
        <AppSidebarNetworkMobile stats={stats} npcSchedule={npcSchedule} />
      )}
    </AppSidebarDrawer>
  );
}
