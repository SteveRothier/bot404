"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getMobilePageMeta } from "@/lib/layout/mobile-page-meta";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  profileUsername: string | null;
};

export function MobileTopBar({ user, profile, profileUsername }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  const meta = getMobilePageMeta(pathname, profileUsername);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md min-[500px]:hidden">
      <div className="flex h-[53px] items-center gap-3 px-4">
        {meta.showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Retour"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary/80"
          >
            <ArrowLeft className="size-5" strokeWidth={2} />
          </button>
        ) : user && profile ? (
          <Link
            href={`/profile/${profile.username}`}
            aria-label="Mon profil"
            className="shrink-0"
          >
            <UserAvatar
              avatarUrl={profile.avatar_url}
              fallbackSeed={user.id}
              username={profile.username}
              className="size-8 rounded-full"
              imageClassName="rounded-full object-cover"
              fallbackClassName="rounded-full text-xs"
            />
          </Link>
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )}

        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-bold">
          {meta.title}
        </h1>

        <span className="size-8 shrink-0" aria-hidden />
      </div>
    </header>
  );
}
