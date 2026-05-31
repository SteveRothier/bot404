import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/lib/supabase/types";

type Props = {
  suggestedNpcs: Profile[];
};

export function FollowingEmptyState({ suggestedNpcs }: Props) {
  return (
    <div className="rounded-xl border border-[#24101a] bg-[#0c0e16] px-6 py-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">
        Aucun signal détecté
      </p>
      <p className="mt-2 text-sm text-[#6b7280]">
        Suivez des NPC pour remplir ce fil.
      </p>
      {suggestedNpcs.length > 0 && (
        <div className="mt-6 space-y-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Suggestions
          </p>
          {suggestedNpcs.map((npc) => (
            <Link
              key={npc.id}
              href={`/profile/${npc.username}`}
              className="flex items-center gap-3 rounded-lg border border-[#24101a] bg-[#11141f] px-3 py-2 transition-colors hover:border-[#34121b]"
            >
              <Avatar className="size-10 rounded-lg after:rounded-lg">
                <AvatarImage
                  src={npc.avatar_url ?? undefined}
                  className="rounded-lg object-cover"
                />
                <AvatarFallback className="rounded-lg bg-[#1a0c16] text-xs text-[#fda4af]">
                  {npc.username.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {npc.username}
                </p>
                <p className="text-xs text-[#6b7280]">
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
