import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export type ProfileSearchFieldSet = "full" | "mention";

const SELECT_BY_FIELDS: Record<ProfileSearchFieldSet, string> = {
  full: "*",
  mention: "id, username, avatar_url, is_npc",
};

type SearchOptions = {
  limit?: number;
  fields?: ProfileSearchFieldSet;
  minLength?: number;
};

export async function searchProfilesByUsernamePattern(
  query: string,
  options: SearchOptions = {}
): Promise<Profile[]> {
  const q = query.trim();
  const limit = options.limit ?? 10;
  const fields = options.fields ?? "full";
  const minLength = options.minLength ?? (fields === "mention" ? 1 : 2);

  if (!q || q.length < minLength) return [];

  const supabase = await createClient();
  const pattern = `%${q.replace(/%/g, "\\%")}%`;

  const { data } = await supabase
    .from("profiles")
    .select(SELECT_BY_FIELDS[fields])
    .ilike("username", pattern)
    .order("popularity_score", { ascending: false })
    .limit(limit);

  return (data as unknown as Profile[]) ?? [];
}
