import type { PostType, WorldEvent } from "@/lib/supabase/types";

export type WorldEventEffects = {
  factions: string[];
  banner_copy: string | null;
  boost_post_types: PostType[];
  unlock_archive_slug: string | null;
};

const POST_TYPES: PostType[] = ["message", "theory", "signal", "rumor"];

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function asPostTypes(value: unknown): PostType[] {
  return asStringArray(value).filter((v): v is PostType =>
    POST_TYPES.includes(v as PostType)
  );
}

function parseWorldEventEffects(
  raw: Record<string, unknown> | null | undefined
): WorldEventEffects {
  const effects = raw ?? {};
  return {
    factions: asStringArray(effects.factions),
    banner_copy:
      typeof effects.banner_copy === "string" ? effects.banner_copy : null,
    boost_post_types: asPostTypes(effects.boost_post_types),
    unlock_archive_slug:
      typeof effects.unlock_archive_slug === "string"
        ? effects.unlock_archive_slug
        : null,
  };
}

export function getWorldEventEffects(event: WorldEvent): WorldEventEffects {
  return parseWorldEventEffects(event.effects);
}

export function formatBoostedTypesLabel(types: PostType[]): string | null {
  if (types.length === 0) return null;
  const labels: Record<PostType, string> = {
    message: "signaux",
    theory: "théories",
    signal: "signaux bruts",
    rumor: "rumeurs",
  };
  return types.map((t) => labels[t]).join(", ");
}
