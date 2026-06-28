import type { ReactionKind } from "@/lib/supabase/types";

export const REACTION_LABELS: Record<
  ReactionKind,
  { label: string; verb: string }
> = {
  relay: { label: "J'aime", verb: "aimer" },
};

export function isReactionKind(value: string): value is ReactionKind {
  return value === "relay";
}

export type ReactionCounts = Record<ReactionKind, number>;

export function applyReactionToggle(
  prevActive: ReactionKind | null,
  counts: ReactionCounts,
  kind: ReactionKind
): { active: ReactionKind | null; counts: ReactionCounts } {
  if (prevActive === kind) {
    return {
      active: null,
      counts: { relay: Math.max(0, counts.relay - 1) },
    };
  }
  return {
    active: kind,
    counts: { relay: counts.relay + 1 },
  };
}
