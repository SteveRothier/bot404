"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
};

export function AuthNav({ user, profile }: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function signOut() {
    setMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  if (!user) {
    return (
      <SidebarNavItem label="Connexion">
        <Link
          href="/login"
          aria-label="Connexion"
          className={cn(
            "inline-flex items-center justify-center rounded-full font-bold transition-colors",
            "size-[52px] bg-foreground text-background hover:bg-foreground/90",
            "lg:h-9 lg:w-auto lg:px-4 lg:text-sm"
          )}
        >
          <LogIn className="size-[22px] lg:hidden" strokeWidth={2} />
          <span className="hidden lg:inline">Connexion</span>
        </Link>
      </SidebarNavItem>
    );
  }

  const username = profile?.username ?? "Profil";
  const handle = `@${username.toLowerCase()}`;

  return (
    <div ref={menuRef} className="relative w-full">
      <div
        className={cn(
          "flex w-full items-center",
          "justify-center lg:justify-between lg:gap-1 lg:rounded-full lg:px-3 lg:py-2 lg:transition-colors lg:hover:bg-secondary/80"
        )}
      >
        <SidebarNavItem label="Mon profil" className="lg:hidden">
          <Link
            href={profile ? `/profile/${profile.username}` : "/"}
            aria-label="Mon profil"
            className="flex shrink-0 items-center justify-center rounded-full"
          >
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              fallbackSeed={user.id}
              username={username}
              className="h-9 w-9"
            />
          </Link>
        </SidebarNavItem>

        <Link
          href={profile ? `/profile/${profile.username}` : "/"}
          aria-label="Mon profil"
          className="hidden min-w-0 flex-1 items-center gap-3 lg:flex"
        >
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            fallbackSeed={user.id}
            username={username}
            className="h-10 w-10 shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-bold text-foreground">
              {username}
            </p>
            <p className="truncate text-[15px] text-muted-foreground">
              {handle}
            </p>
          </div>
        </Link>

        <button
          type="button"
          aria-label="Menu du compte"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="hidden shrink-0 rounded-full p-2 text-foreground transition-colors hover:bg-secondary/80 lg:inline-flex"
        >
          <MoreHorizontal className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute bottom-full right-0 z-50 mb-2 hidden min-w-[220px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_28px_rgba(0,0,0,0.55)] lg:block">
          <button
            type="button"
            onClick={signOut}
            className="block w-full px-4 py-3 text-left text-[15px] font-bold text-foreground transition-colors hover:bg-secondary/80"
          >
            Se déconnecter {handle}
          </button>
        </div>
      )}
    </div>
  );
}
