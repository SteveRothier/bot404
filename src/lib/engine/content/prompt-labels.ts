import type { PostType, ReactionKind } from "@/lib/supabase/types";

function postTypeLabel(postType: PostType | null | undefined): string {
  if (postType === "rumor") return "rumeur";
  if (postType === "theory") return "théorie";
  if (postType === "signal") return "signal";
  return "post";
}

export function reactionActionLabel(
  _reactionKind: ReactionKind,
  postType: PostType | null | undefined
): string {
  return `aimé un ${postTypeLabel(postType)}`;
}

export function reactionPromptBlock(
  _reactionKind: ReactionKind | null | undefined,
  _postType: PostType | null | undefined
): string {
  return "";
}
