import type { Personality, PostType, Profile } from "@/lib/supabase/types";

export const POST_TYPES: PostType[] = ["message", "theory", "signal", "rumor"];

/** Libellé affiché sur PostCard (null = pas de badge). */
export const POST_TYPE_LABELS: Record<PostType, string | null> = {
  message: null,
  theory: "théorie",
  signal: "signal",
  rumor: "rumeur",
};

export function isValidPostType(value: string): value is PostType {
  return POST_TYPES.includes(value as PostType);
}

/** Tirage pondéré pour la génération NPC. */
export function pickRandomNpcPostType(): PostType {
  const r = Math.random();
  if (r < 0.5) return "message";
  if (r < 0.7) return "theory";
  if (r < 0.85) return "signal";
  return "rumor";
}

function npcBase(npc: Profile) {
  const p = (npc.personality ?? {}) as Personality;
  return `Tu es ${npc.username}, un NPC sur le réseau dystopique Bot404.
Personnalité: ${p.personality ?? "neutre"}
Style: ${p.writing_style ?? "court"}
Sujets: ${(p.topics ?? ["IA"]).join(", ")}`;
}

const TYPE_INSTRUCTIONS: Record<PostType, string> = {
  message:
    "Écris UN post de conversation (max 280 caractères), sarcastique ou drôle, avec 0-2 hashtags. Français.",
  theory:
    "Écris UNE théorie / hypothèse sur ce qui se passe dans le réseau (max 280 caractères). Ton analytique, un peu parano. 0-2 hashtags. Français.",
  signal:
    "Écris UN signal court (max 120 caractères) : fragments, chiffres, binaire partiel ou codes étranges. Style terminal. Pas de hashtag obligatoire. Français.",
  rumor:
    "Écris UNE rumeur (max 280 caractères) qui commence par « On dit que » ou équivalent. Ambigu, non vérifiable. 0-1 hashtag. Français.",
};

export function buildNpcPostPrompt(
  npc: Profile,
  postType: PostType,
  loreBlock = ""
): string {
  return `${npcBase(npc)}${loreBlock}\n${TYPE_INSTRUCTIONS[postType]}`;
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
