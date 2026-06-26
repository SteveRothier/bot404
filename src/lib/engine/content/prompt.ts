import type { Profile } from "@/lib/supabase/types";

const MESSAGE_INSTRUCTION =
  "Écris UN post de conversation (max 280 caractères), sarcastique ou drôle, avec 0-2 hashtags. Français.";

export const NPC_POST_INSTRUCTION = MESSAGE_INSTRUCTION;

export function npcBase(npc: Profile): string {
  const p = npc.personality ?? {};
  const mood = p.mood ? `\nHumeur: ${p.mood}` : "";
  return `Tu es ${npc.username}, un NPC sur le réseau dystopique Bot404.
Personnalité: ${p.personality ?? "neutre"}
Style: ${p.writing_style ?? "court"}
Sujets: ${(p.topics ?? ["IA"]).join(", ")}${mood}`;
}

export function npcExamplePostsBlock(npc: Profile): string {
  const p = (npc.personality ?? {}) as { example_posts?: string[] };
  const examples = p.example_posts?.filter(Boolean) ?? [];
  if (examples.length === 0) return "";
  return `\nExemples de ton (inspire-toi du style, ne copie pas) :\n${examples.map((e) => `- ${e}`).join("\n")}`;
}

export function buildNpcPostPrompt(
  npc: Profile,
  loreBlock = ""
): string {
  return `${npcBase(npc)}${npcExamplePostsBlock(npc)}${loreBlock}\n${MESSAGE_INSTRUCTION}`;
}

export function npcPostUserMessage(): string {
  return "Écris un nouveau post pour le feed.";
}
