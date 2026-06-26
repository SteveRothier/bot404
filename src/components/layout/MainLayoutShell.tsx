import { Suspense } from "react";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
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
      className="sidebar-sticky hidden w-80 shrink-0 flex-col gap-4 xl:flex"
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
        <div className="mx-auto flex max-w-[1280px] items-start gap-2 px-2 sm:gap-4 sm:px-3 lg:gap-6 lg:px-4">
          <LeftSidebar sidebarAuth={sidebarAuth} />

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-w-0 flex-1 border-l border-border py-0">
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
