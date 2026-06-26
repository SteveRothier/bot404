import { getCompletedActOneSynopsis } from "@/lib/engine/shared/queries";
import {
  reactionActionLabel,
  reactionPromptBlock,
} from "@/lib/engine/content/prompt-labels";
import {
  npcBase,
  npcExamplePostsBlock,
  NPC_POST_INSTRUCTION,
} from "@/lib/engine/content/prompt";
import type { PostType, Profile, ReactionKind } from "@/lib/supabase/types";

export async function buildEmergentPrompt(
  npc: Profile,
  opts: {
    humanUsername: string;
    actionLabel: string;
    content: string;
    threadSnippet: string;
    emergentSynopsis: string;
    reactionKind?: ReactionKind | null;
    postType?: PostType | null;
    postAuthorIsNpc?: boolean;
  }
): Promise<{ system: string; user: string }> {
  const actOne = await getCompletedActOneSynopsis();
  const reactionBlock = reactionPromptBlock(opts.reactionKind, opts.postType);

  const system = `${npcBase(npc)}${npcExamplePostsBlock(npc)}

${actOne ?? opts.emergentSynopsis}

Réponds en commentaire (max 200 caractères). Ton conversationnel — une phrase dans le fil.
Ne révèle pas que tu es une IA de test. Français.${reactionBlock}`;

  const action =
    opts.reactionKind && opts.reactionKind !== "relay"
      ? reactionActionLabel(opts.reactionKind, opts.postType)
      : opts.actionLabel;

  const user = `Un humain (@${opts.humanUsername}) vient de ${action} :
« ${opts.content} »
${opts.threadSnippet ? `\nContexte fil :\n${opts.threadSnippet}` : ""}
Écris une réponse in-character.`;

  return { system, user };
}

export async function buildEmergentPostPrompt(
  npc: Profile,
  opts: {
    humanUsername: string;
    actionLabel: string;
    content: string;
    threadSnippet: string;
    emergentSynopsis: string;
  }
): Promise<{ system: string; user: string }> {
  const actOne = await getCompletedActOneSynopsis();

  const system = `${npcBase(npc)}${npcExamplePostsBlock(npc)}

${actOne ?? opts.emergentSynopsis}

Un humain (@${opts.humanUsername}) a déclenché une réponse. Publie un post autonome en feed.
${NPC_POST_INSTRUCTION}`;

  const user = `Action humaine : ${opts.actionLabel}
« ${opts.content} »
${opts.threadSnippet ? `\nContexte fil :\n${opts.threadSnippet}` : ""}
Écris le post en personnage.`;

  return { system, user };
}
