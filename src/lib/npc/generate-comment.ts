import { processCommentFactionEffects } from "@/lib/factions/simulation";
import {
  buildNpcLorePromptBlock,
  getNpcLoreContext,
} from "@/lib/lore/lore-context";
import { checkOllamaStatus } from "@/lib/ollama";
import { buildRichThreadSnippet } from "@/lib/npc/thread-context";
import { buildNpcHistoryBlock, fetchRecentNpcPostContents } from "@/lib/npc/npc-history";
import { ollamaChat } from "@/lib/npc/ollama";
import { npcBase, npcExamplePostsBlock } from "@/lib/npc/prompt";
import { pickRotatingNpc, factionNameForNpc } from "@/lib/npc/select-npc";
import { validateNpcPostContent } from "@/lib/npc/validate-content";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Personality, Profile } from "@/lib/supabase/types";

export type GenerateNpcCommentResult =
  | { ok: true; author: string; postId: number; commentId: number }
  | { ok: false; error: string };

async function pickPostToComment(): Promise<{
  id: number;
  content: string;
  author_id: string;
} | null> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, author_id, author:profiles!author_id(is_npc)")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!posts?.length) return null;

  const humanPosts = posts.filter((p) => {
    const author = p.author as { is_npc?: boolean } | null;
    return author?.is_npc === false;
  });

  const pool = humanPosts.length > 0 ? humanPosts : posts;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { id: pick.id, content: pick.content, author_id: pick.author_id };
}

export async function generateNpcComment(): Promise<GenerateNpcCommentResult> {
  const ollama = await checkOllamaStatus();
  if (!ollama.online) {
    return {
      ok: false,
      error: "Ollama est hors ligne. Lancez ollama serve puis réessayez.",
    };
  }

  const supabase = createAdminClient();
  const post = await pickPostToComment();

  if (!post) {
    return { ok: false, error: "Aucun post récent pour commenter." };
  }

  const { data: npcs } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true);

  if (!npcs?.length) {
    return { ok: false, error: "Aucun NPC trouvé." };
  }

  const commenters = (npcs as Profile[]).filter((n) => n.id !== post.author_id);
  if (!commenters.length) {
    return { ok: false, error: "Aucun NPC disponible pour commenter." };
  }

  const npc =
    (await pickRotatingNpc(new Set([post.author_id]))) ??
    commenters[Math.floor(Math.random() * commenters.length)];

  const p = (npc.personality ?? {}) as Personality;
  const [loreBlock, historyBlock, threadBlock, recentPosts] = await Promise.all([
    getNpcLoreContext().then(buildNpcLorePromptBlock),
    buildNpcHistoryBlock(npc.id),
    buildRichThreadSnippet(post.id),
    fetchRecentNpcPostContents(npc.id),
  ]);

  const system = `${npcBase(npc, factionNameForNpc(npc))}${npcExamplePostsBlock(npc)}${loreBlock}${historyBlock}

Fil de discussion :
${threadBlock}

Réponds en commentaire (max 200 caractères), ton: ${p.personality ?? "sarcastique"}. Apporte un angle différent des commentaires existants. Français.`;
  const user = `Post original: "${post.content}"\nÉcris une réponse courte et originale.`;

  const raw = await ollamaChat(system, user, 300, "comment");
  const content = raw
    ? validateNpcPostContent(raw, "message", post.content, recentPosts)
    : null;

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
