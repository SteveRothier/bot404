import { AuthNav } from "@/components/layout/AuthNav";
import { AppSidebarLogo } from "@/components/layout/AppSidebarLogo";
import { LeftSidebarNav } from "@/components/layout/LeftSidebarNav";
import { SidebarSearch } from "@/components/layout/SidebarSearch";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  profileUsername: string | null;
  className?: string;
};

export async function AppSidebarContent({
  user,
  profile,
  profileUsername,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-2 overflow-hidden py-2 lg:gap-4",
        className
      )}
    >
      <div className="px-1 lg:px-3">
        <AppSidebarLogo />
      </div>

      <div className="px-1 lg:px-3">
        <SidebarSearch />
      </div>

      <LeftSidebarNav profileUsername={profileUsername} />

      <div className="mt-auto border-t border-border px-1 pt-3 lg:px-3 lg:pt-4">
        <AuthNav user={user} profile={profile} />
      </div>
    </div>
  );
}
