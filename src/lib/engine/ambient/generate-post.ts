import { checkOllamaStatus } from "@/lib/ollama";
import { resolveNpcPostMedia, shouldAttachMediaToNpcPost } from "@/lib/engine/content/media";
import { maybeAttachNpcPoll, shouldNpcAttachPoll } from "@/lib/engine/content/poll-create";
import { ollamaChat, ollamaProfileForPostType } from "@/lib/engine/content/ollama";
import {
  buildNpcPostPrompt,
  npcPostUserMessage,
} from "@/lib/engine/content/prompt";
import {
  getTrendingHashtagsForNpc,
  trendingPromptBlock,
} from "@/lib/engine/shared/trending";
import { maybeAmbientNpcReactions, maybeNpcReactionsOnPost } from "@/lib/engine/casting/npc-reaction";
import { pickRandomNpcPostType } from "@/lib/post-types";
import { pickRotatingNpc } from "@/lib/engine/casting/select-npc";
import {
  buildNpcHistoryBlock,
  fetchRecentNpcPostContents,
} from "@/lib/engine/ambient/npc-history";
import {
  getWelcomeFocusHuman,
  welcomeAmbientPromptBlock,
} from "@/lib/engine/reactive/welcome-human";
import { getNpcPostReactionBounds, rollChance } from "@/lib/engine/reactive/tick-config";
import { validateNpcAmbientPostContent } from "@/lib/engine/content/validate-content";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType } from "@/lib/supabase/types";

export type GenerateNpcPostResult =
  | { ok: true; author: string; postId: number; postType: string }
  | { ok: false; error: string };

export function clampNpcPostBatchCount(count: number): number {
  const n = Number.isFinite(count) ? Math.floor(count) : 1;
  return Math.min(5, Math.max(1, n));
}

async function generateSingleNpcPost(
  excludeNpcIds: Set<string> = new Set()
): Promise<GenerateNpcPostResult & { npcId?: string }> {
  const supabase = createAdminClient();
  const npc = await pickRotatingNpc(excludeNpcIds);
  if (!npc) {
    return { ok: false, error: "Aucun NPC trouvé." };
  }

  const historyBlock = await buildNpcHistoryBlock(npc.id);
  const recentPosts = await fetchRecentNpcPostContents(npc.id);

  const postType = pickRandomNpcPostType();

  let welcomeBlock = "";
  const focus = await getWelcomeFocusHuman();
  if (focus && Math.random() < 0.35) {
    welcomeBlock = welcomeAmbientPromptBlock(focus.username);
  }

  const trends = await getTrendingHashtagsForNpc(5);
  const useTrend = trends.length > 0 && Math.random() < 0.72;
  const trendBlock = useTrend
    ? trendingPromptBlock(trends, Math.random() < 0.55)
    : "";

  const system = buildNpcPostPrompt(npc, historyBlock + welcomeBlock + trendBlock);
  const user = npcPostUserMessage(useTrend);
  const ollamaProfile = ollamaProfileForPostType(postType);

  let content: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await ollamaChat(system, user, 500, ollamaProfile);
    content = raw
      ? validateNpcAmbientPostContent(raw, postType as PostType, recentPosts)
      : null;
    if (content) break;
  }

  if (!content) {
    return {
      ok: false,
      error: "Échec après 3 tentatives (Ollama ou contenu filtré).",
    };
  }

  const usePoll = shouldNpcAttachPoll(postType as PostType, false, "ambient");

  const media =
    !usePoll && shouldAttachMediaToNpcPost(npc, postType)
      ? await resolveNpcPostMedia(npc, content, postType)
      : null;

  const { data: post, error: insertError } = await supabase
    .from("posts")
    .insert({
      author_id: npc.id,
      content,
      post_type: postType,
      likes_count: Math.floor(Math.random() * 500) + 50,
      media_url: media?.media_url ?? null,
      media_type: media?.media_type ?? null,
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

  if (usePoll) {
    await maybeAttachNpcPoll({
      supabase,
      postId: post.id,
      npc,
      content,
      postType: postType as PostType,
      hasMedia: false,
      context: "ambient",
      forceAttach: true,
    });
  }

  const reactionBounds = getNpcPostReactionBounds();
  await maybeNpcReactionsOnPost(post.id, {
    humanAuthorId: npc.id,
    postType: postType as PostType,
    postContent: content,
    minCount: reactionBounds.min,
    maxCount: reactionBounds.max,
  });

  if (rollChance(0.5)) {
    await maybeAmbientNpcReactions(1);
  }

  return {
    ok: true,
    author: npc.username,
    postId: post.id,
    postType,
    npcId: npc.id,
  };
}

export async function generateNpcPost(): Promise<GenerateNpcPostResult> {
  const ollama = await checkOllamaStatus();
  if (!ollama.online) {
    return {
      ok: false,
      error: "Ollama est hors ligne. Lancez ollama serve puis réessayez.",
    };
  }

  return generateSingleNpcPost();
}

export async function generateNpcPostsBatch(
  count = 1
): Promise<GenerateNpcPostResult[]> {
  const ollama = await checkOllamaStatus();
  if (!ollama.online) {
    return [
      {
        ok: false,
        error: "Ollama est hors ligne. Lancez ollama serve puis réessayez.",
      },
    ];
  }

  const batchSize = clampNpcPostBatchCount(count);
  const results: GenerateNpcPostResult[] = [];
  const usedNpcIds = new Set<string>();

  for (let i = 0; i < batchSize; i++) {
    const result = await generateSingleNpcPost(usedNpcIds);
    if (result.ok) {
      if (result.npcId) usedNpcIds.add(result.npcId);
      results.push({
        ok: true,
        author: result.author,
        postId: result.postId,
        postType: result.postType,
      });
    } else {
      results.push(result);
      if (result.error.includes("Ollama est hors ligne")) break;
    }
  }

  return results;
}
