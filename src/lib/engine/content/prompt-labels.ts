import type { PostType, ReactionKind } from "@/lib/supabase/types";

function postTypeLabel(_postType: PostType | null | undefined): string {
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
