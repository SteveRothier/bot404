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
    <aside className="layout-sidebar-column z-30 hidden w-[68px] flex-col transition-[width] duration-200 min-[500px]:flex lg:w-[275px]">
      <AppSidebarContent
        user={user}
        profile={profile}
        profileUsername={profileUsername}
      />
    </aside>
  );
}
