import { Suspense } from "react";
import { AppSidebarMobile } from "@/components/layout/AppSidebarMobile";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebarLoader } from "@/components/layout/RightSidebarLoader";
import { ClientStoresHydrator } from "@/components/providers/ClientStoresHydrator";
import { getCachedSidebarAuth } from "@/lib/queries/cached";
import { getDefaultOllamaStatus } from "@/lib/ollama";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";

type Props = {
  children: React.ReactNode;
};

function RightSidebarSkeleton() {
  return (
    <aside
      className="sidebar-sticky hidden w-80 shrink-0 flex-col gap-4 xl:flex"
      aria-hidden
    >
      <div className="h-32 animate-pulse rounded-2xl bg-secondary/50" />
      <div className="h-40 animate-pulse rounded-2xl bg-secondary/50" />
      <div className="h-48 animate-pulse rounded-2xl bg-secondary/50" />
    </aside>
  );
}

export async function MainLayoutShell({ children }: Props) {
  const sidebarAuth = await getCachedSidebarAuth();
  const userId = sidebarAuth.user?.id ?? null;
  const initialUnreadCount = userId
    ? await getUnreadNotificationCount()
    : 0;

  return (
    <ClientStoresHydrator
      factions={[]}
      ollama={getDefaultOllamaStatus()}
      userId={userId}
      initialUnreadCount={initialUnreadCount}
    >
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-[1280px] items-start gap-6 px-3 lg:gap-8 lg:px-4">
          <LeftSidebar sidebarAuth={sidebarAuth} />

          <div className="flex min-w-0 flex-1 flex-col">
            <AppSidebarMobile sidebarAuth={sidebarAuth} />
            <main className="min-w-0 flex-1 border-l border-border py-0 lg:max-w-[600px]">
              {children}
            </main>
          </div>

          <Suspense fallback={<RightSidebarSkeleton />}>
            <RightSidebarLoader />
          </Suspense>
        </div>
      </div>
    </ClientStoresHydrator>
  );
}
