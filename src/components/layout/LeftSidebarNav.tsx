"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  Compass,
  Flag,
  HelpCircle,
  Home,
  LayoutDashboard,
  MessageCircle,
  User,
} from "lucide-react";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/stores/notifications-store";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

type Props = {
  profileUsername?: string | null;
};

function buildNavItems(profileUsername?: string | null): NavItem[] {
  return [
    { href: "/", label: "Signaux", icon: Home },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/trending", label: "Explorer", icon: Compass },
    { href: "/comment-jouer", label: "Comment jouer", icon: HelpCircle },
    { href: "/factions", label: "Factions", icon: Flag },
    { href: "/dashboard", label: "Tableau", icon: LayoutDashboard },
    profileUsername
      ? { href: `/profile/${profileUsername}`, label: "Profil", icon: User }
      : { href: "/login", label: "Profil", icon: User },
    profileUsername
      ? { href: "/saved", label: "Sauvegardés", icon: Bookmark }
      : { href: "/login", label: "Sauvegardés", icon: Bookmark },
  ];
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  if (href === "/factions" && pathname.startsWith("/factions")) return true;
  if (href === "/comment-jouer" && pathname.startsWith("/comment-jouer"))
    return true;
  if (href === "/notifications" && pathname.startsWith("/notifications"))
    return true;
  if (href === "/messages" && pathname.startsWith("/messages")) return true;
  if (
    href.startsWith("/profile/") &&
    pathname.startsWith("/profile/") &&
    !pathname.startsWith("/profile/edit")
  ) {
    return true;
  }
  return false;
}

export function LeftSidebarNav({ profileUsername = null }: Props) {
  const pathname = usePathname();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const navItems = buildNavItems(profileUsername);

  return (
    <nav className="flex flex-col gap-0.5 px-1 lg:px-0" aria-label="Navigation principale">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(pathname, item.href);
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
                  className="h-[26px] w-[26px]"
                  strokeWidth={active ? 2.25 : 1.75}
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
