"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  profileUsername?: string | null;
};

const items = [
  { href: "/", label: "Feed", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/trending",
    label: "Explorer",
    icon: Compass,
    match: (p: string) => p.startsWith("/trending"),
  },
  {
    href: "/search",
    label: "Recherche",
    icon: Search,
    match: (p: string) => p.startsWith("/search"),
  },
] as const;

export function MobileNav({ profileUsername }: Props) {
  const pathname = usePathname();
  const profileHref = profileUsername
    ? `/profile/${profileUsername}`
    : "/login";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2b1117] bg-background/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium uppercase tracking-wide",
                active ? "text-[#fb7185]" : "text-[#6b7280]"
              )}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
        <Link
          href={profileHref}
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium uppercase tracking-wide",
            pathname.startsWith("/profile")
              ? "text-[#fb7185]"
              : "text-[#6b7280]"
          )}
        >
          <User className="size-5" strokeWidth={1.75} />
          Profil
        </Link>
      </div>
    </nav>
  );
}
