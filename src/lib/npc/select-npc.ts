import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/supabase/types";
import { getRecentlyActiveNpcIds } from "@/lib/npc/npc-history";

/** Tirage parmi les NPC les moins actifs récemment (rotation). */
export async function pickRotatingNpc(
  excludeIds: Set<string> = new Set()
): Promise<Profile | null> {
  const supabase = createAdminClient();
  const recentlyActive = await getRecentlyActiveNpcIds(2);

  const { data: npcs, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true)
    .order("popularity_score", { ascending: true })
    .limit(15);

  if (error || !npcs?.length) return null;

  const pool = (npcs as Profile[]).filter(
    (n) => !excludeIds.has(n.id) && !recentlyActive.has(n.id)
  );
  const candidates =
    pool.length > 0
      ? pool
      : (npcs as Profile[]).filter((n) => !excludeIds.has(n.id));
  const fallback = candidates.length > 0 ? candidates : (npcs as Profile[]);
  return fallback[Math.floor(Math.random() * fallback.length)] ?? null;
}

export async function loadAllNpcs(): Promise<Profile[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, faction:factions(name)")
    .eq("is_npc", true);

  return (data as Profile[]) ?? [];
}

export function factionNameForNpc(npc: Profile): string | null {
  const f = npc.faction as { name?: string } | null | undefined;
  return f?.name ?? null;
}
