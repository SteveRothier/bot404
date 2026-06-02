import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AppShellFallback } from "@/components/layout/AppShellFallback";
import { getCachedSidebarAuth } from "@/lib/queries/cached";
import { getShellData } from "@/lib/queries/shell-data";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";

type Props = {
  children: React.ReactNode;
};

async function AppShellWithData({
  children,
  sidebarAuth,
}: {
  children: React.ReactNode;
  sidebarAuth: Awaited<ReturnType<typeof getCachedSidebarAuth>>;
}) {
  const shell = await getShellData();
  const initialUnreadCount = sidebarAuth.user
    ? await getUnreadNotificationCount()
    : 0;

  return (
    <AppShell
      stats={shell.stats}
      hashtags={shell.hashtags}
      factions={shell.factions}
      npcSchedule={shell.npcSchedule}
      ollama={shell.ollama}
      sidebarAuth={sidebarAuth}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </AppShell>
  );
}

export async function MainLayoutShell({ children }: Props) {
  const sidebarAuth = await getCachedSidebarAuth();

  return (
    <Suspense
      fallback={
        <AppShellFallback sidebarAuth={sidebarAuth}>{children}</AppShellFallback>
      }
    >
      <AppShellWithData sidebarAuth={sidebarAuth}>{children}</AppShellWithData>
    </Suspense>
  );
}
