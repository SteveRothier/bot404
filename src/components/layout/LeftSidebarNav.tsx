"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { buildMainNavItems, isMainNavActive } from "@/lib/layout/nav-items";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/stores/notifications-store";

type Props = {
  profileUsername?: string | null;
};

export function LeftSidebarNav({ profileUsername = null }: Props) {
  const pathname = usePathname();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const navItems = buildMainNavItems(profileUsername);

  return (
    <nav className="flex flex-col gap-0.5 px-1 lg:px-0" aria-label="Navigation principale">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isMainNavActive(pathname, item.href);
        const showNotifBadge =
          item.href === "/notifications" && unreadCount > 0;

        return (
          <SidebarNavItem key={item.label} label={item.label}>
            <Link
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "surface-hover flex items-center rounded-lg py-3 text-[15px] text-foreground",
                "justify-center px-0 lg:justify-start lg:gap-4 lg:px-3",
                active && "font-bold"
              )}
            >
              <span className="relative shrink-0">
                <Icon
                  className="h-[26px] w-[26px] text-foreground"
                  strokeWidth={active ? 2.25 : 1.75}
                  fill="none"
                />
                {showNotifBadge && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground lg:hidden">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="hidden min-w-0 flex-1 lg:inline">{item.label}</span>
              {showNotifBadge && (
                <span className="hidden size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground lg:flex">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </SidebarNavItem>
        );
      })}
    </nav>
  );
}
