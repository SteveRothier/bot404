import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { avatarFallbackSeed } from "@/lib/avatars";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  suggestedNpcs: Profile[];
};

export function FollowingEmptyState({ suggestedNpcs }: Props) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-[15px] text-muted-foreground">
        Suivez des profils pour remplir ce fil.
      </p>
      {suggestedNpcs.length > 0 && (
        <div className="mt-6 space-y-2 text-left">
          <p className="px-1 text-[15px] font-bold text-foreground">
            Suggestions
          </p>
          {suggestedNpcs.map((npc) => (
            <Link
              key={npc.id}
              href={`/profile/${npc.username}`}
              className="surface-hover flex items-center gap-3 rounded-lg px-3 py-2"
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
          ))}
        </div>
      )}
    </div>
  );
}
