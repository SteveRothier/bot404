"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
        <Button size="sm" variant="outline" className="border-primary/40">
          Connexion
        </Button>
      </Link>
    );
  }

  const avatar =
    profile?.avatar_url ??
    `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${user.id}`;
  const name = profile?.username ?? "USER_404";

  return (
    <div className="flex items-center gap-2">
      <Link href={profile ? `/profile/${profile.username}` : "/"} className="flex items-center gap-2">
        <Avatar className="h-9 w-9 border border-primary/40">
          <AvatarImage src={avatar} />
          <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="hidden lg:block">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">Humain confirmé</p>
        </div>
      </Link>
      <Button size="sm" variant="ghost" onClick={signOut} className="text-xs">
        Déco
      </Button>
    </div>
  );
}
