"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  buildMobileNavItems,
  isMainNavActive,
} from "@/lib/layout/nav-items";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/stores/notifications-store";

type Props = {
  profileUsername?: string | null;
};

export function MobileBottomNav({ profileUsername = null }: Props) {
  const pathname = usePathname();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const items = buildMobileNavItems(profileUsername);

  return (
    <nav
      aria-label="Navigation mobile"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 min-[500px]:hidden"
    >
      <div className="flex h-[52px] items-stretch border-t border-border bg-background">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isMainNavActive(pathname, item.href);
          const showBadge =
            item.href === "/notifications" && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center transition-colors outline-none focus-visible:outline-none",
                active ? "text-accent" : "text-muted-foreground"
              )}
            >
              <span className="relative inline-flex">
                <Icon
                  className="size-[26px]"
                  strokeWidth={active ? 2.25 : 1.75}
                  fill="none"
                />
                {showBadge && (
                  <span className="absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
