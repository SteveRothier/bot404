"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { resolveAvatarUrl } from "@/lib/avatars";
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
      <Link href="/login">
        <Button
          size="sm"
          className="rounded-full bg-foreground px-4 font-bold text-background hover:bg-foreground/90"
        >
          Connexion
        </Button>
      </Link>
    );
  }

  const avatar = resolveAvatarUrl(profile?.avatar_url, user.id);

  return (
    <div className="flex items-center gap-2">
      <Link href={profile ? `/profile/${profile.username}` : "/"}>
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatar} />
          <AvatarFallback className="bg-secondary text-xs">
            {(profile?.username ?? "U").slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <Button
        size="sm"
        variant="ghost"
        onClick={signOut}
        className="hidden text-sm text-muted-foreground sm:inline-flex"
      >
        Déco
      </Button>
    </div>
  );
}
