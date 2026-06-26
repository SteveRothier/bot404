import type { PostType, ReactionKind } from "@/lib/supabase/types";

export function priorityForPost(_postType: PostType): number {
  return 22;
}

export function priorityForReaction(kind: ReactionKind): number {
  if (kind === "amplify") return 30;
  if (kind === "relay") return 22;
  return 10;
}

/** Priorité narrative pour amplify / flag / relay. */
export function priorityForReactionSignal(
  kind: ReactionKind,
  _postType: PostType | null | undefined
): number {
  if (kind === "relay") return 18;
  if (kind === "amplify") return 30;
  if (kind === "flag") return 28;
  return priorityForReaction(kind);
}

export function isStrongEmergentSignal(input: {
  kind: string;
  priority: number;
  postType?: string | null;
}): boolean {
  if (input.kind === "human_joined") return true;
  if (input.kind === "human_post") {
    return input.priority >= 22;
  }
  return input.priority >= 40;
}

export { priorityForHumanJoined } from "@/lib/engine/reactive/welcome-human";
