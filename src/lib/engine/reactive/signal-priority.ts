import type { PostType, ReactionKind } from "@/lib/supabase/types";

export function priorityForPost(_postType: PostType): number {
  return 22;
}

export function priorityForReaction(_kind: ReactionKind): number {
  return 22;
}

export function priorityForReactionSignal(
  _kind: ReactionKind,
  _postType: PostType | null | undefined
): number {
  return 18;
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
