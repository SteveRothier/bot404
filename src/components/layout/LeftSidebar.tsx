import { AppSidebarContent } from "@/components/layout/AppSidebarContent";
import type { Profile } from "@/lib/supabase/types";

type SidebarAuth = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  profileUsername: string | null;
};

type Props = {
  sidebarAuth: SidebarAuth;
};

export function LeftSidebar({ sidebarAuth }: Props) {
  const { user, profile, profileUsername } = sidebarAuth;

  return (
    <aside className="sidebar-sticky z-30 flex h-[calc(100vh-1rem)] w-[68px] shrink-0 flex-col overflow-visible transition-[width] duration-200 lg:w-[275px]">
      <AppSidebarContent
        user={user}
        profile={profile}
        profileUsername={profileUsername}
      />
    </aside>
  );
}
