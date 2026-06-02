import { processCommentFactionEffects } from "@/lib/factions/simulation";
import {
  buildNpcLorePromptBlock,
  getNpcLoreContext,
} from "@/lib/lore/lore-context";
import { checkOllamaStatus } from "@/lib/ollama";
import { ollamaChat } from "@/lib/npc/ollama";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Personality, Profile } from "@/lib/supabase/types";

export type GenerateNpcCommentResult =
  | { ok: true; author: string; postId: number; commentId: number }
  | { ok: false; error: string };

export async function generateNpcComment(): Promise<GenerateNpcCommentResult> {
  const ollama = await checkOllamaStatus();
  if (!ollama.online) {
    return {
      ok: false,
      error: "Ollama est hors ligne. Lancez ollama serve puis réessayez.",
    };
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, author_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!posts?.length) {
    return { ok: false, error: "Aucun post récent pour commenter." };
  }

  const { data: npcs } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true);

  if (!npcs?.length) {
    return { ok: false, error: "Aucun NPC trouvé." };
  }

  const post = posts[Math.floor(Math.random() * posts.length)];
  const commenters = npcs.filter((n) => n.id !== post.author_id);
  if (!commenters.length) {
    return { ok: false, error: "Aucun NPC disponible pour commenter." };
  }

  const npc = commenters[Math.floor(Math.random() * commenters.length)] as Profile;
  const p = (npc.personality ?? {}) as Personality;
  const loreBlock = buildNpcLorePromptBlock(await getNpcLoreContext());

  const system = `Tu es ${npc.username}. Réponds en commentaire (max 200 caractères), ton: ${p.personality ?? "sarcastique"}. Français.${loreBlock}`;
  const user = `Post original: "${post.content}"\nÉcris une réponse courte.`;

  const content = await ollamaChat(system, user, 300);
  if (!content) {
    return {
      ok: false,
      error: "Échec de la génération (Ollama ou contenu filtré).",
    };
  }

  const { data: comment, error: insertError } = await supabase
    .from("comments")
    .insert({
      post_id: post.id,
      author_id: npc.id,
      content,
    })
    .select("id")
    .single();

  if (insertError || !comment) {
    return {
      ok: false,
      error: insertError?.message ?? "Impossible d'enregistrer le commentaire.",
    };
  }

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  await processCommentFactionEffects(supabase, post.id, npc.id, content);

  return {
    ok: true,
    author: npc.username,
    postId: post.id,
    commentId: comment.id,
  };
}
