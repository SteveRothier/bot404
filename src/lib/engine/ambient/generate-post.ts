import { resolveOllamaActionContext } from "@/lib/ollama-server";
import type { OllamaProvider } from "@/lib/ollama-bridge";
import { signBridgePayload, verifyBridgePayload } from "@/lib/ollama-bridge-token";
import type { OllamaOverride } from "@/lib/ollama-config";
import { resolveNpcPostMedia, shouldAttachMediaToNpcPost } from "@/lib/engine/content/media";
import { maybeAttachNpcPoll, shouldNpcAttachPoll } from "@/lib/engine/content/poll-create";
import {
  createServerOllamaProvider,
  ollamaProfileForPostType,
  type OllamaChatProfile,
} from "@/lib/engine/content/ollama";
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
import {
  NPC_GENERATION_DISABLED_ERROR,
  isNpcGenerationEnabled,
} from "@/lib/engine/shared/generation-gate";
import { validateNpcAmbientPostContent } from "@/lib/engine/content/validate-content";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType } from "@/lib/supabase/types";

export type GenerateNpcPostResult =
  | { ok: true; author: string; postId: number; postType: string }
  | { ok: false; error: string };

export type NpcPostPrepareResult =
  | {
      ok: true;
      prepareToken: string;
      system: string;
      user: string;
      profile: OllamaChatProfile;
      postType: PostType;
    }
  | { ok: false; error: string };

type PreparedNpcPostPayload = {
  v: 1;
  npcId: string;
  postType: PostType;
  usePoll: boolean;
  recentContents: string[];
};

export function clampNpcPostBatchCount(count: number): number {
  const n = Number.isFinite(count) ? Math.floor(count) : 1;
  return Math.min(5, Math.max(1, n));
}

async function buildNpcPostDraft(
  excludeNpcIds: Set<string> = new Set()
): Promise<
  | {
      ok: true;
      npc: Awaited<ReturnType<typeof pickRotatingNpc>> & object;
      postType: PostType;
      system: string;
      user: string;
      ollamaProfile: OllamaChatProfile;
      usePoll: boolean;
      recentPosts: string[];
    }
  | { ok: false; error: string }
> {
  const npc = await pickRotatingNpc(excludeNpcIds);
  if (!npc) {
    return { ok: false, error: "Aucun NPC trouvé." };
  }

  const historyBlock = await buildNpcHistoryBlock(npc.id);
  const recentPosts = await fetchRecentNpcPostContents(npc.id);
  const postType = pickRandomNpcPostType() as PostType;

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
  const usePoll = shouldNpcAttachPoll(postType, false, "ambient");

  return {
    ok: true,
    npc,
    postType,
    system,
    user,
    ollamaProfile,
    usePoll,
    recentPosts,
  };
}

async function persistNpcPost(
  npc: NonNullable<Awaited<ReturnType<typeof pickRotatingNpc>>>,
  postType: PostType,
  content: string,
  usePoll: boolean,
  provider: OllamaProvider
): Promise<GenerateNpcPostResult & { npcId?: string }> {
  const supabase = createAdminClient();

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
      postType,
      hasMedia: false,
      context: "ambient",
      forceAttach: true,
      provider,
    });
  }

  const reactionBounds = getNpcPostReactionBounds();
  await maybeNpcReactionsOnPost(post.id, {
    humanAuthorId: npc.id,
    postType,
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

export async function generateSingleNpcPost(
  excludeNpcIds: Set<string> = new Set(),
  provider: OllamaProvider = createServerOllamaProvider()
): Promise<GenerateNpcPostResult & { npcId?: string }> {
  const draft = await buildNpcPostDraft(excludeNpcIds);
  if (!draft.ok) return draft;

  const { npc, postType, system, user, ollamaProfile, usePoll, recentPosts } =
    draft;

  let content: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await provider.chat(system, user, 500, ollamaProfile);
    content = raw
      ? validateNpcAmbientPostContent(raw, postType, recentPosts)
      : null;
    if (content) break;
  }

  if (!content) {
    return {
      ok: false,
      error: "Échec après 3 tentatives (Ollama ou contenu filtré).",
    };
  }

  return persistNpcPost(npc, postType, content, usePoll, provider);
}

export async function prepareNpcPostGeneration(
  excludeNpcIds: Set<string> = new Set()
): Promise<NpcPostPrepareResult> {
  if (!isNpcGenerationEnabled()) {
    return { ok: false, error: NPC_GENERATION_DISABLED_ERROR };
  }

  const draft = await buildNpcPostDraft(excludeNpcIds);
  if (!draft.ok) return draft;

  const { npc, postType, system, user, ollamaProfile, usePoll, recentPosts } =
    draft;

  const prepareToken = signBridgePayload<PreparedNpcPostPayload>({
    v: 1,
    npcId: npc.id,
    postType,
    usePoll,
    recentContents: recentPosts,
  });

  return {
    ok: true,
    prepareToken,
    system,
    user,
    profile: ollamaProfile,
    postType,
  };
}

export async function commitNpcPostGeneration(
  prepareToken: string,
  rawContent: string
): Promise<GenerateNpcPostResult> {
  if (!isNpcGenerationEnabled()) {
    return { ok: false, error: NPC_GENERATION_DISABLED_ERROR };
  }

  const payload = verifyBridgePayload<PreparedNpcPostPayload>(prepareToken);
  if (!payload || payload.v !== 1) {
    return { ok: false, error: "Session de génération expirée ou invalide." };
  }

  const supabase = createAdminClient();
  const { data: npc } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", payload.npcId)
    .maybeSingle();

  if (!npc) {
    return { ok: false, error: "NPC introuvable." };
  }

  const content = validateNpcAmbientPostContent(
    rawContent,
    payload.postType,
    payload.recentContents
  );

  if (!content) {
    return { ok: false, error: "Contenu filtré ou invalide." };
  }

  return persistNpcPost(
    npc,
    payload.postType,
    content,
    payload.usePoll,
    createServerOllamaProvider()
  );
}

async function ensurePostProvider(
  ollama?: OllamaOverride
): Promise<
  | { ok: true; provider: OllamaProvider }
  | { ok: false; error: string; clientBridge?: true }
> {
  const ctx = await resolveOllamaActionContext(ollama);
  if (!ctx.ok) return ctx;
  if (ctx.clientBridge) {
    return { ok: false, error: "CLIENT_BRIDGE", clientBridge: true };
  }
  return { ok: true, provider: ctx.provider };
}

export async function generateNpcPost(
  ollama?: OllamaOverride,
  provider?: OllamaProvider
): Promise<GenerateNpcPostResult> {
  if (!isNpcGenerationEnabled()) {
    return { ok: false, error: NPC_GENERATION_DISABLED_ERROR };
  }

  if (provider) {
    return generateSingleNpcPost(new Set(), provider);
  }

  const resolved = await ensurePostProvider(ollama);
  if (!resolved.ok) {
    if (resolved.clientBridge) {
      return {
        ok: false,
        error: "CLIENT_BRIDGE",
      };
    }
    return { ok: false, error: resolved.error };
  }

  return generateSingleNpcPost(new Set(), resolved.provider);
}

export async function generateNpcPostsBatch(
  count = 1,
  ollama?: OllamaOverride,
  provider?: OllamaProvider
): Promise<GenerateNpcPostResult[]> {
  if (!isNpcGenerationEnabled()) {
    return [{ ok: false, error: NPC_GENERATION_DISABLED_ERROR }];
  }

  let activeProvider = provider;
  if (!activeProvider) {
    const resolved = await ensurePostProvider(ollama);
    if (!resolved.ok) {
      if (resolved.clientBridge) {
        return [{ ok: false, error: "CLIENT_BRIDGE" }];
      }
      return [{ ok: false, error: resolved.error }];
    }
    activeProvider = resolved.provider;
  }

  const batchSize = clampNpcPostBatchCount(count);
  const results: GenerateNpcPostResult[] = [];
  const usedNpcIds = new Set<string>();

  for (let i = 0; i < batchSize; i++) {
    const result = await generateSingleNpcPost(usedNpcIds, activeProvider);
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
