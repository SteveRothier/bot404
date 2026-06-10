"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
};

export function AuthNav({ user, profile }: Props) {
  const router = useRouter();

  async function signOut() {
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

  return (
    <div
      className={cn(
        "flex items-center",
        "justify-center gap-0 lg:justify-start lg:gap-2"
      )}
    >
      <SidebarNavItem label="Mon profil">
        <Link
          href={profile ? `/profile/${profile.username}` : "/"}
          aria-label="Mon profil"
          className="flex shrink-0 items-center justify-center rounded-full lg:justify-start"
        >
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            fallbackSeed={user.id}
            username={profile?.username ?? "U"}
            className="h-9 w-9"
          />
        </Link>
      </SidebarNavItem>
      <Button
        size="sm"
        variant="ghost"
        onClick={signOut}
        className="hidden text-sm text-muted-foreground lg:inline-flex"
      >
        Déco
      </Button>
    </div>
  );
}
