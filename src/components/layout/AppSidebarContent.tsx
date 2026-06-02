import { AuthNav } from "@/components/layout/AuthNav";
import { AppSidebarLogo } from "@/components/layout/AppSidebarLogo";
import { LeftSidebarNav } from "@/components/layout/LeftSidebarNav";
import { SearchBar } from "@/components/layout/SearchBar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
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
    <div className={cn("flex min-h-full flex-col gap-4 py-2", className)}>
      <div className="flex items-center justify-between gap-2 px-3">
        <AppSidebarLogo />
        {user && (
          <div className="hidden lg:block">
            <NotificationBell />
          </div>
        )}
      </div>

      <div className="px-3">
        <SearchBar />
      </div>

      <LeftSidebarNav profileUsername={profileUsername} />

      <div className="mt-auto border-t border-border px-3 pt-4">
        <AuthNav user={user} profile={profile} />
      </div>
    </div>
  );
}
