import { Suspense } from "react";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { RightSidebarLoader } from "@/components/layout/RightSidebarLoader";
import { ClientStoresHydrator } from "@/components/providers/ClientStoresHydrator";
import { getCachedSidebarAuth } from "@/lib/queries/shell";
import { getDefaultOllamaStatus } from "@/lib/ollama";
import { getUnreadNotificationCount } from "@/lib/queries/social";

type Props = {
  children: React.ReactNode;
};

function RightSidebarSkeleton() {
  return (
    <aside
      className="layout-sidebar-column hidden w-80 flex-col gap-4 pt-3 xl:flex"
      aria-hidden
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg border border-border bg-background/80"
        />
      ))}
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
      ollama={getDefaultOllamaStatus()}
      userId={userId}
      initialUnreadCount={initialUnreadCount}
    >
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-[1280px] items-start gap-0 px-0 min-[500px]:gap-2 min-[500px]:px-2 sm:min-[500px]:gap-4 sm:min-[500px]:px-3 lg:gap-6 lg:px-4">
          <LeftSidebar sidebarAuth={sidebarAuth} />

          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBar
              user={sidebarAuth.user}
              profile={sidebarAuth.profile}
              profileUsername={sidebarAuth.profileUsername}
            />
            <main className="layout-main min-w-0 flex-1 min-[500px]:border-l min-[500px]:border-border">
              {children}
            </main>
          </div>

          <Suspense fallback={<RightSidebarSkeleton />}>
            <RightSidebarLoader />
          </Suspense>
        </div>

        <MobileBottomNav profileUsername={sidebarAuth.profileUsername} />
      </div>
    </ClientStoresHydrator>
  );
}
