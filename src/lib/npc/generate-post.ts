import { processPostFactionEffects } from "@/lib/factions/simulation";
import {
  buildNpcLorePromptBlock,
  getNpcLoreContext,
} from "@/lib/lore/lore-context";
import { getWorldEventEffects } from "@/lib/lore/world-event-effects";
import { checkOllamaStatus } from "@/lib/ollama";
import {
  buildNpcPostPrompt,
  npcPostUserMessage,
  pickRandomNpcPostType,
} from "@/lib/post-types";
import { ollamaChat } from "@/lib/npc/ollama";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/supabase/types";

export type GenerateNpcPostResult =
  | { ok: true; author: string; postId: number; postType: string }
  | { ok: false; error: string };

export async function generateNpcPost(): Promise<GenerateNpcPostResult> {
  const ollama = await checkOllamaStatus();
  if (!ollama.online) {
    return {
      ok: false,
      error: "Ollama est hors ligne. Lancez ollama serve puis réessayez.",
    };
  }

  const supabase = createAdminClient();

  const { data: npcs, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true)
    .order("popularity_score", { ascending: true })
    .limit(5);

  if (error || !npcs?.length) {
    return { ok: false, error: "Aucun NPC trouvé." };
  }

  const npc = npcs[Math.floor(Math.random() * npcs.length)] as Profile;
  const loreContext = await getNpcLoreContext();
  const loreBlock = buildNpcLorePromptBlock(loreContext);

  const eventEffects = loreContext.activeEvent
    ? getWorldEventEffects(loreContext.activeEvent)
    : null;

  let postType = pickRandomNpcPostType();
  if (
    eventEffects &&
    eventEffects.boost_post_types.length > 0 &&
    Math.random() < 0.55
  ) {
    postType =
      eventEffects.boost_post_types[
        Math.floor(Math.random() * eventEffects.boost_post_types.length)
      ];
  }

  const sectorCodes = ["1A", "2B", "3C", "4D", "5E", "6F", "7G", "8H"];
  let sector_code =
    Math.random() < 0.4
      ? sectorCodes[Math.floor(Math.random() * sectorCodes.length)]
      : null;

  if (
    eventEffects &&
    eventEffects.sectors.length > 0 &&
    Math.random() < 0.5
  ) {
    sector_code =
      eventEffects.sectors[
        Math.floor(Math.random() * eventEffects.sectors.length)
      ];
  }

  const content = await ollamaChat(
    buildNpcPostPrompt(npc, postType, loreBlock),
    npcPostUserMessage(postType)
  );

  if (!content) {
    return {
      ok: false,
      error: "Échec de la génération (Ollama ou contenu filtré).",
    };
  }

  const { data: post, error: insertError } = await supabase
    .from("posts")
    .insert({
      author_id: npc.id,
      content,
      post_type: postType,
      sector_code,
      likes_count: Math.floor(Math.random() * 500) + 50,
    })
    .select("id")
    .single();

  if (insertError || !post) {
    return {
      ok: false,
      error: insertError?.message ?? "Impossible d'enregistrer le post.",
    };
  }

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  await processPostFactionEffects(supabase, post.id);

  return {
    ok: true,
    author: npc.username,
    postId: post.id,
    postType,
  };
}
