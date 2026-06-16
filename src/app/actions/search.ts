"use server";

import { searchProfilesByUsernamePattern } from "@/lib/queries/profile-search";
import type { Profile } from "@/lib/supabase/types";

export async function searchProfilesForMention(
  query: string
): Promise<Pick<Profile, "id" | "username" | "avatar_url" | "is_npc">[]> {
  const profiles = await searchProfilesByUsernamePattern(query, {
    limit: 6,
    fields: "mention",
    minLength: 1,
  });

  return profiles.map(({ id, username, avatar_url, is_npc }) => ({
    id,
    username,
    avatar_url,
    is_npc,
  }));
}
