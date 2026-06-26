import type { PostType } from "@/lib/supabase/types";

/** Types acceptés à la création côté produit. */
export const POST_TYPES: PostType[] = ["message"];

export function isValidPostType(value: string): value is PostType {
  return value === "message";
}

/** Tirage pour la génération NPC — toujours message. */
export function pickRandomNpcPostType(): PostType {
  return "message";
}
