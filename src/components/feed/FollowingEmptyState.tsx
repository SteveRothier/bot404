import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/lib/avatars";
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
              <Avatar className="size-10 rounded-full">
                <AvatarImage
                  src={resolveAvatarUrl(npc.avatar_url, npc.username)}
                  className="rounded-full object-cover"
                />
                <AvatarFallback className="rounded-full bg-secondary text-xs">
                  {npc.username.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
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
