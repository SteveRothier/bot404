import { contentHasHuntKeywords } from "@/lib/engine/shared/hunt-keywords";
import { isEmergentModeActive } from "@/lib/engine/shared/queries";
import type { NarrativeSignal } from "@/lib/engine/shared/types";
import {
  getWelcomeFocusHuman,
  welcomeAmbientPromptBlock,
} from "@/lib/engine/reactive/welcome-human";
import { checkOllamaStatus } from "@/lib/ollama";
import { pickNpcForSignal } from "@/lib/engine/casting/cast";
import { buildRichThreadSnippet } from "@/lib/engine/casting/thread-context";
import { buildNpcHistoryBlock, fetchRecentNpcPostContents } from "@/lib/engine/ambient/npc-history";
import { ollamaChat } from "@/lib/engine/content/ollama";
import { npcBase, npcExamplePostsBlock } from "@/lib/engine/content/prompt";
import { validateNpcPostContent } from "@/lib/engine/content/validate-content";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/supabase/types";

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
  const emergentActive = await isEmergentModeActive();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, author_id, author:profiles!author_id(is_npc)")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(emergentActive ? 30 : 20);

  if (!posts?.length) return null;

  const humanPosts = posts.filter((p) => {
    const author = p.author as { is_npc?: boolean } | null;
    return author?.is_npc === false;
  });

  const pool =
    emergentActive && humanPosts.length > 0
      ? humanPosts
      : humanPosts.length > 0
        ? humanPosts
        : posts;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { id: pick.id, content: pick.content, author_id: pick.author_id };
}

export async function generateNpcComment(): Promise<GenerateNpcCommentResult> {
  const ollama = await checkOllamaStatus();
  if (!ollama.online) {
    return {
      ok: false,
      error: "Ollama est hors ligne. Lancez ollama serve et réessayez.",
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

  const castSignal: NarrativeSignal = {
    id: 0,
    kind: "human_post",
    author_id: post.author_id,
    post_id: post.id,
    comment_id: null,
    reaction_kind: null,
    mentioned_username: null,
    priority: 30,
    status: "pending",
    payload: { content: post.content },
    result: {},
    created_at: new Date().toISOString(),
    handled_at: null,
  };

  const npc =
    pickNpcForSignal(commenters, {
      signal: castSignal,
      humanContent: post.content,
      excludeNpcIds: new Set([post.author_id]),
      huntContent: contentHasHuntKeywords(post.content),
    }) ?? commenters[Math.floor(Math.random() * commenters.length)];

  const [historyBlock, threadBlock, recentPosts, welcomeFocus] =
    await Promise.all([
      buildNpcHistoryBlock(npc.id),
      buildRichThreadSnippet(post.id),
      fetchRecentNpcPostContents(npc.id),
      getWelcomeFocusHuman(),
    ]);

  const welcomeBlock =
    welcomeFocus && Math.random() < 0.35
      ? welcomeAmbientPromptBlock(welcomeFocus.username)
      : "";

  const system = `${npcBase(npc)}${npcExamplePostsBlock(npc)}${historyBlock}${welcomeBlock}

Fil de discussion :
${threadBlock}

Réponds en commentaire (max 200 caractères). Ton conversationnel — une phrase dans le fil. Français.`;
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

  return {
    ok: true,
    author: npc.username,
    postId: post.id,
    commentId: comment.id,
  };
}
