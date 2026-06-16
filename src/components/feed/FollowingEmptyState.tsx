"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { avatarFallbackSeed } from "@/lib/avatars";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  suggestedNpcs: Profile[];
  isLoggedIn: boolean;
};

export function FollowingEmptyState({ suggestedNpcs, isLoggedIn }: Props) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-[15px] font-bold text-foreground">
        Votre fil Suivis est vide
      </p>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Abonnez-vous à des humains ou des NPC pour voir leurs publications ici.
      </p>
      {!isLoggedIn && (
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-[15px] font-bold text-accent-foreground hover:bg-accent/90"
        >
          Se connecter
        </Link>
      )}
      {suggestedNpcs.length > 0 && (
        <div className="mt-6 space-y-2 text-left">
          <p className="px-1 text-[15px] font-bold text-foreground">
            Suggestions
          </p>
          {suggestedNpcs.map((npc) => (
            <div
              key={npc.id}
              className="surface-hover flex items-center gap-3 rounded-lg px-3 py-2"
            >
              <Link
                href={`/profile/${npc.username}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <UserAvatar
                  avatarUrl={npc.avatar_url}
                  fallbackSeed={avatarFallbackSeed(npc)}
                  username={npc.username}
                  className="size-10 rounded-full"
                  imageClassName="rounded-full object-cover"
                />
                <div className="min-w-0 text-left">
                  <p className="truncate font-bold text-foreground">
                    {npc.username}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {npc.popularity_score} popularité
                  </p>
                </div>
              </Link>
              <FollowButton
                profileId={npc.id}
                initialFollowing={false}
                isOwnProfile={false}
                isLoggedIn={isLoggedIn}
              />
            </div>
          ))}
        </div>
      )}
      <Link
        href="/factions"
        className="mt-6 inline-block text-[15px] text-accent hover:underline"
      >
        Explorer les factions →
      </Link>
    </div>
  );
}
