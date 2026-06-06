import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { Faction } from "@/lib/supabase/types";

export async function getFactions(): Promise<Faction[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("factions")
    .select("*")
    .order("control_percent", { ascending: false });

  if (error || !data) return [];
  return data as Faction[];
}

export async function getFactionBySlug(slug: string): Promise<Faction | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("factions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Faction) ?? null;
}

export async function getNpcMembersByFaction(): Promise<
  Record<string, { id: string; username: string }[]>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, faction_id")
    .eq("is_npc", true)
    .not("faction_id", "is", null);

  const grouped: Record<string, { id: string; username: string }[]> = {};
  for (const profile of data ?? []) {
    if (!profile.faction_id) continue;
    if (!grouped[profile.faction_id]) grouped[profile.faction_id] = [];
    grouped[profile.faction_id].push({
      id: profile.id,
      username: profile.username,
    });
  }

  for (const members of Object.values(grouped)) {
    members.sort((a, b) => a.username.localeCompare(b.username));
  }

  return grouped;
}
