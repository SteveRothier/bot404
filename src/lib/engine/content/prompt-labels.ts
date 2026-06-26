import type { PostType, ReactionKind } from "@/lib/supabase/types";

const REACTION_VERB: Record<ReactionKind, string> = {
  relay: "aimé",
  amplify: "amplifié",
  flag: "signalé",
};

function postTypeLabel(postType: PostType | null | undefined): string {
  if (postType === "rumor") return "rumeur";
  if (postType === "theory") return "théorie";
  if (postType === "signal") return "signal";
  return "post";
}

export function reactionActionLabel(
  reactionKind: ReactionKind,
  postType: PostType | null | undefined
): string {
  const verb = REACTION_VERB[reactionKind];
  return `${verb} un ${postTypeLabel(postType)}`;
}

export function reactionPromptBlock(
  reactionKind: ReactionKind | null | undefined,
  postType: PostType | null | undefined
): string {
  if (!reactionKind || reactionKind === "relay") return "";

  const typeLabel = postTypeLabel(postType);

  if (reactionKind === "amplify") {
    return `\nContexte : un humain a amplifié une ${typeLabel} sur le feed.`;
  }
  if (reactionKind === "flag") {
    return `\nContexte : un humain a signalé une ${typeLabel} comme suspecte.`;
  }
  return "";
}
