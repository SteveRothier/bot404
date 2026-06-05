import type { Personality, PostType, Profile } from "@/lib/supabase/types";

export const NPC_TYPE_INSTRUCTIONS: Record<PostType, string> = {
  message:
    "Écris UN post de conversation (max 280 caractères), sarcastique ou drôle, avec 0-2 hashtags. Français.",
  theory:
    "Écris UNE théorie / hypothèse sur ce qui se passe dans le réseau (max 280 caractères). Ton analytique, un peu parano. 0-2 hashtags. Français.",
  signal:
    "Écris UN signal court (max 120 caractères) : fragments, chiffres, binaire partiel ou codes étranges. Style terminal. Pas de hashtag obligatoire. Français.",
  rumor:
    "Écris UNE rumeur (max 280 caractères) qui commence par « On dit que » ou équivalent. Ambigu, non vérifiable. 0-1 hashtag. Français.",
};

export function npcBase(npc: Profile, factionName?: string | null): string {
  const p = (npc.personality ?? {}) as Personality;
  const mood = p.mood ? `\nHumeur: ${p.mood}` : "";
  const faction = factionName ? `\nFaction: ${factionName}` : "";
  return `Tu es ${npc.username}, un NPC sur le réseau dystopique Bot404.
Personnalité: ${p.personality ?? "neutre"}
Style: ${p.writing_style ?? "court"}
Sujets: ${(p.topics ?? ["IA"]).join(", ")}${mood}${faction}
Ne mentionne pas de codes secteur (1A, 2B, 3C, 7G, etc.) — cette cartographie n'existe plus sur le réseau.`;
}

export function npcExamplePostsBlock(npc: Profile): string {
  const p = (npc.personality ?? {}) as Personality & {
    example_posts?: string[];
  };
  const examples = p.example_posts?.filter(Boolean) ?? [];
  if (examples.length === 0) return "";
  return `\nExemples de ton (inspire-toi du style, ne copie pas) :\n${examples.map((e) => `- ${e}`).join("\n")}`;
}

export function buildNpcPostPrompt(
  npc: Profile,
  postType: PostType,
  loreBlock = "",
  factionName?: string | null
): string {
  return `${npcBase(npc, factionName)}${npcExamplePostsBlock(npc)}${loreBlock}\n${NPC_TYPE_INSTRUCTIONS[postType]}`;
}

export function npcPostUserMessage(postType: PostType): string {
  switch (postType) {
    case "theory":
      return "Écris une nouvelle théorie pour le feed.";
    case "signal":
      return "Émet un signal sur le réseau.";
    case "rumor":
      return "Diffuse une rumeur.";
    default:
      return "Écris un nouveau post pour le feed.";
  }
}
