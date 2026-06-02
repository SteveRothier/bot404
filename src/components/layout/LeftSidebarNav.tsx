"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Bell,
  Bookmark,
  Compass,
  FileSearch,
  Flag,
  Home,
  LayoutDashboard,
  Map,
  User,
} from "lucide-react";
import { useNavDrawerClose } from "@/components/layout/NavDrawerContext";
import { cn } from "@/lib/utils";

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
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/trending", label: "Explorer", icon: Compass },
    { href: "/map", label: "Carte", icon: Map },
    { href: "/factions", label: "Factions", icon: Flag },
    { href: "/dossiers", label: "Dossiers", icon: FileSearch },
    { href: "/archives", label: "Archives", icon: Archive },
    { href: "/dashboard", label: "Tableau", icon: LayoutDashboard },
    profileUsername
      ? { href: `/profile/${profileUsername}`, label: "Profil", icon: User }
      : { href: "/login", label: "Profil", icon: User },
    profileUsername
      ? { href: "/saved", label: "Sauvegardés", icon: Bookmark }
      : { href: "/login", label: "Sauvegardés", icon: Bookmark },
  ];
}

export function LeftSidebarNav({ profileUsername = null }: Props) {
  const pathname = usePathname();
  const closeDrawer = useNavDrawerClose();
  const navItems = buildNavItems(profileUsername);

  return (
    <nav className="flex flex-col gap-0.5 py-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === pathname ||
          (item.href === "/factions" && pathname.startsWith("/factions")) ||
          (item.href === "/notifications" &&
            pathname.startsWith("/notifications")) ||
          (item.href.startsWith("/profile/") &&
            pathname.startsWith("/profile/") &&
            !pathname.startsWith("/profile/edit"));

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => closeDrawer?.()}
            className={cn(
              "surface-hover flex items-center gap-4 rounded-lg px-3 py-3 text-[15px] text-foreground",
              active && "font-bold"
            )}
          >
            <Icon className="h-[26px] w-[26px]" strokeWidth={active ? 2.25 : 1.75} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
