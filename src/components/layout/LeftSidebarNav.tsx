"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  Compass,
  Home,
  MessageCircle,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/trending", label: "Explorer", icon: Compass },
  { href: "#", label: "Messages", icon: MessageCircle, soon: true },
  { href: "#", label: "Notifications", icon: Bell, soon: true },
  { href: "#", label: "Profil", icon: User, soon: true },
  { href: "#", label: "Sauvegardés", icon: Bookmark, soon: true },
  { href: "#", label: "Paramètres", icon: Settings, soon: true },
];

export function LeftSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-xl border border-[#2b1117] bg-[#0b0a13] p-2.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = !item.soon && item.href === pathname;
        const className = cn(
          "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors",
          active
            ? "border border-[#3f101c] bg-[#1a0c16] text-[#fb7185]"
            : item.soon
              ? "cursor-not-allowed border border-transparent text-[#4b5563] opacity-60"
              : "border border-transparent text-[#9ca3af] hover:bg-[#171424] hover:text-[#f9a8d4]"
        );

        const content = (
          <>
            <Icon className="h-5 w-5" />
            <span className="flex-1">{item.label}</span>
            {item.soon && (
              <span className="text-[9px] font-semibold uppercase tracking-wide text-[#6b7280]">
                Bientôt
              </span>
            )}
          </>
        );

        return item.soon || item.href === "#" ? (
          <div key={item.label} className={className} aria-disabled="true">
            {content}
          </div>
        ) : (
          <Link key={item.label} href={item.href} className={className}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
