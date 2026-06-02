import { getLatestUnlockedArchive } from "@/lib/queries/archives";
import { getCachedActiveWorldEvents } from "@/lib/queries/world-events";
import type { Archive, WorldEvent } from "@/lib/supabase/types";

export type NpcLoreContext = {
  activeEvent: WorldEvent | null;
  latestArchive: Archive | null;
};

export async function getNpcLoreContext(): Promise<NpcLoreContext> {
  const [events, latestArchive] = await Promise.all([
    getCachedActiveWorldEvents(),
    getLatestUnlockedArchive(),
  ]);

  return {
    activeEvent: events[0] ?? null,
    latestArchive,
  };
}

export function buildNpcLorePromptBlock(context: NpcLoreContext): string {
  const parts: string[] = [];

  if (context.activeEvent) {
    parts.push(
      `Événement mondial actif : « ${context.activeEvent.title} » — ${context.activeEvent.description}`
    );
  }

  if (context.latestArchive) {
    parts.push(
      `Archive récente débloquée : « ${context.latestArchive.title} » (thème : humanité / simulation).`
    );
  }

  if (parts.length === 0) return "";
  return `\nContexte lore du réseau (à refléter dans le ton, sans casser le personnage) :\n${parts.join("\n")}`;
}
