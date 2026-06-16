import { createAdminClient } from "@/lib/supabase/admin";
import { getWorldEventEffects } from "@/lib/lore/world-event-effects";
import type { WorldEvent } from "@/lib/supabase/types";

export type NpcLoreContext = {
  activeEvent: WorldEvent | null;
};

async function fetchActiveWorldEventsAdmin(): Promise<WorldEvent[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("world_events")
    .select("*")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("starts_at", { ascending: false });

  if (error || !data) return [];
  return data as WorldEvent[];
}

/** Contexte lore pour Ollama — utilisable hors requête Next (scripts, cron). */
export async function getNpcLoreContext(): Promise<NpcLoreContext> {
  const events = await fetchActiveWorldEventsAdmin();

  return {
    activeEvent: events[0] ?? null,
  };
}

export function buildNpcLorePromptBlock(context: NpcLoreContext): string {
  if (!context.activeEvent) return "";

  const event = context.activeEvent;
  const effects = getWorldEventEffects(event);
  const parts = [
    `\nContexte lore du réseau (à refléter dans le ton, sans casser le personnage) :`,
    `Événement mondial actif : « ${event.title} » — ${event.description}`,
  ];

  if (effects.banner_copy) {
    parts.push(`Impact : ${effects.banner_copy}`);
  }

  if (effects.related_hashtags.length > 0) {
    const tags = effects.related_hashtags.map((t) => `#${t}`).join(", ");
    parts.push(
      `Hashtags du moment (0-1 max, ne pas répéter bêtement) : ${tags}`
    );
  }

  if (event.slug.startsWith("daily-")) {
    parts.push(
      "Thème du jour : reste focalisé sur cet événement. Apporte un angle NOUVEAU, pas une reformulation des posts récents sur le même sujet."
    );
  }

  return parts.join("\n");
}
