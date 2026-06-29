import { contentHasHuntKeywords } from "@/lib/engine/shared/hunt-keywords";
import {
  getTrendingHashtagsForNpc,
  trendingPromptBlock,
} from "@/lib/engine/shared/trending";
import type { NarrativeSignal } from "@/lib/engine/shared/types";
import {
  getWelcomeFocusHuman,
  welcomeAmbientPromptBlock,
} from "@/lib/engine/reactive/welcome-human";
import { resolveOllamaActionContext } from "@/lib/ollama-server";
import type { OllamaProvider } from "@/lib/ollama-bridge";
import { signBridgePayload, verifyBridgePayload } from "@/lib/ollama-bridge-token";
import type { OllamaOverride } from "@/lib/ollama-config";
import { pickNpcForSignal } from "@/lib/engine/casting/cast";
import { maybeNpcReactionsOnPost } from "@/lib/engine/casting/npc-reaction";
import { maybeNpcLikesOnPostComments } from "@/lib/engine/casting/npc-comment-engagement";
import { maybeNpcVoteOnPoll } from "@/lib/engine/content/poll-vote";
import { buildRichThreadSnippet } from "@/lib/engine/casting/thread-context";
import {
  buildNpcHistoryBlock,
  fetchRecentNpcPostContents,
} from "@/lib/engine/ambient/npc-history";
import { createServerOllamaProvider } from "@/lib/engine/content/ollama";
import { npcBase, npcExamplePostsBlock } from "@/lib/engine/content/prompt";
import { validateNpcCommentContent } from "@/lib/engine/content/validate-content";
import {
  getCommentLikeChance,
  getCommentReplyChance,
  getNpcPostReactionBounds,
  getPostReactionAfterCommentChance,
  rollChance,
} from "@/lib/engine/reactive/tick-config";
import {
  NPC_GENERATION_DISABLED_ERROR,
  isNpcGenerationEnabled,
} from "@/lib/engine/shared/generation-gate";
import { withReplyMention } from "@/lib/mentions";
import { createCommentReplyNotifications } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType, Profile } from "@/lib/supabase/types";

export type GenerateNpcCommentResult =
  | { ok: true; author: string; postId: number; commentId: number; pollVote?: string }
  | { ok: false; error: string };

export type NpcCommentPrepareResult =
  | {
      ok: true;
      prepareToken: string;
      system: string;
      user: string;
    }
  | { ok: false; error: string };

type PreparedNpcCommentPayload = {
  v: 1;
  npcId: string;
  postId: number;
  postType: PostType;
  postContent: string;
  postAuthorId: string;
  isReply: boolean;
  replyUsername?: string;
  recentContents: string[];
};

export function clampNpcCommentBatchCount(count: number): number {
  const n = Number.isFinite(count) ? Math.floor(count) : 1;
  return Math.min(10, Math.max(1, n));
}

type CommentTarget = {
  id: number;
  content: string;
  author_id: string;
  post_type: PostType;
  comment_count: number;
};

type ReplyTarget = {
  id: number;
  author_id: string;
  username: string;
  content: string;
};

async function pickCommentToReply(
  postId: number
): Promise<ReplyTarget | null> {
  const supabase = createAdminClient();

  const { data: comments } = await supabase
    .from("comments")
    .select(
      "id, author_id, content, relay_count, author:profiles!author_id(username)"
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (!comments?.length) return null;

  const weights = comments.map((c) => 1 / (1 + (c.relay_count ?? 0)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * total;

  for (let i = 0; i < comments.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      const author = comments[i].author as { username?: string } | null;
      const username = author?.username;
      if (!username) return null;
      return {
        id: comments[i].id,
        author_id: comments[i].author_id,
        username,
        content: comments[i].content,
      };
    }
  }

  const fallback = comments[comments.length - 1];
  const author = fallback.author as { username?: string } | null;
  if (!author?.username) return null;

  return {
    id: fallback.id,
    author_id: fallback.author_id,
    username: author.username,
    content: fallback.content,
  };
}

async function fetchCommentCounts(
  postIds: number[]
): Promise<Map<number, number>> {
  if (postIds.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds);

  const counts = new Map<number, number>();
  for (const row of data ?? []) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}

async function pickPostToComment(
  excludePostIds: Set<number> = new Set()
): Promise<CommentTarget | null> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, author_id, post_type, author:profiles!author_id(is_npc)")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(60);

  if (!posts?.length) return null;

  const eligible = posts.filter((p) => !excludePostIds.has(p.id));
  if (!eligible.length) return null;

  const counts = await fetchCommentCounts(eligible.map((p) => p.id));

  const scored = eligible.map((p) => {
    const commentCount = counts.get(p.id) ?? 0;
    const author = p.author as { is_npc?: boolean } | null;
    const isHuman = author?.is_npc === false;
    const weight =
      1 / (1 + commentCount) +
      (isHuman ? 0.35 : 0.15) +
      (commentCount > 0 && commentCount <= 10 ? 0.3 : 0);
    return {
      id: p.id,
      content: p.content,
      author_id: p.author_id,
      post_type: (p.post_type ?? "message") as PostType,
      comment_count: commentCount,
      weight,
    };
  });

  const total = scored.reduce((sum, row) => sum + row.weight, 0);
  let r = Math.random() * total;

  for (const row of scored) {
    r -= row.weight;
    if (r <= 0) {
      return {
        id: row.id,
        content: row.content,
        author_id: row.author_id,
        post_type: row.post_type,
        comment_count: row.comment_count,
      };
    }
  }

  const fallback = scored[0];
  return fallback
    ? {
        id: fallback.id,
        content: fallback.content,
        author_id: fallback.author_id,
        post_type: fallback.post_type,
        comment_count: fallback.comment_count,
      }
    : null;
}

async function buildCommentPromptForPost(
  post: CommentTarget,
  usedNpcIds: Set<string> = new Set()
): Promise<
  | {
      ok: true;
      npc: Profile;
      post: CommentTarget;
      system: string;
      user: string;
      isReply: boolean;
      replyUsername?: string;
      recentPosts: string[];
    }
  | { ok: false; error: string; retryPost?: boolean }
> {
  const supabase = createAdminClient();

  const { data: npcs } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true);

  if (!npcs?.length) {
    return { ok: false, error: "Aucun NPC trouvé." };
  }

  const replyTarget =
    post.comment_count > 0 && rollChance(getCommentReplyChance())
      ? await pickCommentToReply(post.id)
      : null;

  const excludeAuthorIds = new Set([post.author_id, ...usedNpcIds]);
  if (replyTarget) excludeAuthorIds.add(replyTarget.author_id);

  const commenters = (npcs as Profile[]).filter(
    (n) => !excludeAuthorIds.has(n.id)
  );
  if (!commenters.length) {
    return { ok: false, error: "Aucun NPC disponible pour commenter." };
  }

  const castSignal: NarrativeSignal = {
    id: 0,
    kind: "human_post",
    author_id: post.author_id,
    post_id: post.id,
    comment_id: replyTarget?.id ?? null,
    reaction_kind: null,
    mentioned_username: replyTarget?.username ?? null,
    priority: 30,
    status: "pending",
    payload: {
      content: replyTarget?.content ?? post.content,
    },
    result: {},
    created_at: new Date().toISOString(),
    handled_at: null,
  };

  const npc =
    pickNpcForSignal(commenters, {
      signal: castSignal,
      humanContent: replyTarget?.content ?? post.content,
      excludeNpcIds: excludeAuthorIds,
      huntContent: contentHasHuntKeywords(post.content),
    }) ?? commenters[Math.floor(Math.random() * commenters.length)];

  const [historyBlock, threadBlock, recentPosts, welcomeFocus, trends] =
    await Promise.all([
      buildNpcHistoryBlock(npc.id),
      buildRichThreadSnippet(post.id),
      fetchRecentNpcPostContents(npc.id),
      getWelcomeFocusHuman(),
      getTrendingHashtagsForNpc(5),
    ]);

  const welcomeBlock =
    welcomeFocus && Math.random() < 0.35
      ? welcomeAmbientPromptBlock(welcomeFocus.username)
      : "";

  const trendBlock =
    Math.random() < 0.45 ? trendingPromptBlock(trends, false) : "";

  const system = `${npcBase(npc)}${npcExamplePostsBlock(npc)}${historyBlock}${welcomeBlock}${trendBlock}

Fil de discussion :
${threadBlock}

Réponds en commentaire (max 200 caractères). Ton conversationnel — une phrase dans le fil. Français.`;
  const user = replyTarget
    ? `Commentaire de @${replyTarget.username}: « ${replyTarget.content} »\nRéponds-lui directement (commence par @${replyTarget.username.toLowerCase()}).`
    : `Post original: "${post.content}"\nÉcris une réponse courte et originale.`;

  return {
    ok: true,
    npc,
    post,
    system,
    user,
    isReply: !!replyTarget,
    replyUsername: replyTarget?.username,
    recentPosts,
  };
}

async function persistNpcComment(
  npc: Profile,
  post: CommentTarget,
  content: string,
  isReply: boolean,
  usedNpcIds: Set<string>,
  provider: OllamaProvider
): Promise<GenerateNpcCommentResult & { npcId?: string }> {
  const supabase = createAdminClient();

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

  if (rollChance(getPostReactionAfterCommentChance())) {
    const reactionBounds = getNpcPostReactionBounds();
    await maybeNpcReactionsOnPost(post.id, {
      humanAuthorId: post.author_id,
      postType: post.post_type,
      postContent: post.content,
      minCount: reactionBounds.min,
      maxCount: reactionBounds.max,
      excludeNpcIds: usedNpcIds,
    });
  }

  if (rollChance(getCommentLikeChance())) {
    await maybeNpcLikesOnPostComments(post.id, {
      minLikes: 1,
      maxLikes: 4,
      excludeNpcIds: new Set([npc.id, ...usedNpcIds]),
    });
  }

  if (isReply) {
    await createCommentReplyNotifications(
      content,
      npc.id,
      post.id,
      comment.id
    );
  }

  let pollVote: string | undefined;
  const vote = await maybeNpcVoteOnPoll(post.id, npc, post.content, provider);
  if (vote.ok) pollVote = vote.label;

  return {
    ok: true,
    author: npc.username,
    postId: post.id,
    commentId: comment.id,
    pollVote,
    npcId: npc.id,
  };
}

async function tryGenerateCommentForPost(
  post: CommentTarget,
  excludePostIds: Set<number>,
  usedNpcIds: Set<string> = new Set(),
  provider: OllamaProvider = createServerOllamaProvider()
): Promise<
  | { ok: true; npc: Profile; content: string; isReply: boolean; post: CommentTarget }
  | { ok: false; error: string; retryPost?: boolean }
> {
  const draft = await buildCommentPromptForPost(post, usedNpcIds);
  if (!draft.ok) return draft;

  const { npc, system, user, isReply, replyUsername, recentPosts } = draft;

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await provider.chat(system, user, 300, "comment");
    const validated = raw
      ? validateNpcCommentContent(raw, post.content, recentPosts)
      : null;
    if (!validated) continue;

    const content = isReply && replyUsername
      ? withReplyMention(validated, replyUsername)
      : validated;

    return {
      ok: true,
      npc,
      content,
      isReply,
      post: draft.post,
    };
  }

  excludePostIds.add(post.id);
  return {
    ok: false,
    error: "Contenu filtré après 3 tentatives.",
    retryPost: true,
  };
}

export async function prepareNpcCommentGeneration(
  excludePostIds: Set<number> = new Set(),
  usedNpcIds: Set<string> = new Set()
): Promise<NpcCommentPrepareResult> {
  if (!isNpcGenerationEnabled()) {
    return { ok: false, error: NPC_GENERATION_DISABLED_ERROR };
  }

  for (let postAttempt = 0; postAttempt < 3; postAttempt++) {
    const post = await pickPostToComment(excludePostIds);
    if (!post) {
      return { ok: false, error: "Aucun post récent pour commenter." };
    }

    const draft = await buildCommentPromptForPost(post, usedNpcIds);
    if (!draft.ok) {
      if (draft.error.includes("Aucun NPC")) return draft;
      excludePostIds.add(post.id);
      continue;
    }

    const prepareToken = signBridgePayload<PreparedNpcCommentPayload>({
      v: 1,
      npcId: draft.npc.id,
      postId: post.id,
      postType: post.post_type,
      postContent: post.content,
      postAuthorId: post.author_id,
      isReply: draft.isReply,
      replyUsername: draft.replyUsername,
      recentContents: draft.recentPosts,
    });

    return {
      ok: true,
      prepareToken,
      system: draft.system,
      user: draft.user,
    };
  }

  return {
    ok: false,
    error: "Aucun post adapté pour commenter.",
  };
}

export async function commitNpcCommentGeneration(
  prepareToken: string,
  rawContent: string
): Promise<GenerateNpcCommentResult> {
  if (!isNpcGenerationEnabled()) {
    return { ok: false, error: NPC_GENERATION_DISABLED_ERROR };
  }

  const payload = verifyBridgePayload<PreparedNpcCommentPayload>(prepareToken);
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

  const validated = validateNpcCommentContent(
    rawContent,
    payload.postContent,
    payload.recentContents
  );

  if (!validated) {
    return { ok: false, error: "Contenu filtré ou invalide." };
  }

  const content =
    payload.isReply && payload.replyUsername
      ? withReplyMention(validated, payload.replyUsername)
      : validated;

  const post: CommentTarget = {
    id: payload.postId,
    content: payload.postContent,
    author_id: payload.postAuthorId,
    post_type: payload.postType,
    comment_count: 0,
  };

  return persistNpcComment(
    npc,
    post,
    content,
    payload.isReply,
    new Set(),
    createServerOllamaProvider()
  );
}

async function ensureCommentProvider(
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

async function generateSingleNpcComment(
  excludePostIds: Set<number>,
  usedNpcIds: Set<string> = new Set(),
  provider: OllamaProvider = createServerOllamaProvider()
): Promise<GenerateNpcCommentResult & { npcId?: string }> {
  for (let postAttempt = 0; postAttempt < 3; postAttempt++) {
    const post = await pickPostToComment(excludePostIds);
    if (!post) {
      return { ok: false, error: "Aucun post récent pour commenter." };
    }

    const draft = await tryGenerateCommentForPost(
      post,
      excludePostIds,
      usedNpcIds,
      provider
    );
    if (!draft.ok) {
      if (draft.retryPost) continue;
      return { ok: false, error: draft.error };
    }

    return persistNpcComment(
      draft.npc,
      draft.post,
      draft.content,
      draft.isReply,
      usedNpcIds,
      provider
    );
  }

  return {
    ok: false,
    error: "Échec après plusieurs tentatives (contenu filtré ou Ollama).",
  };
}

export async function generateNpcComment(
  ollama?: OllamaOverride,
  provider?: OllamaProvider
): Promise<GenerateNpcCommentResult> {
  if (!isNpcGenerationEnabled()) {
    return { ok: false, error: NPC_GENERATION_DISABLED_ERROR };
  }

  if (provider) {
    return generateSingleNpcComment(new Set(), new Set(), provider);
  }

  const resolved = await ensureCommentProvider(ollama);
  if (!resolved.ok) {
    if (resolved.clientBridge) {
      return { ok: false, error: "CLIENT_BRIDGE" };
    }
    return { ok: false, error: resolved.error };
  }

  return generateSingleNpcComment(new Set(), new Set(), resolved.provider);
}

export async function generateNpcCommentsBatch(
  count = 2,
  ollama?: OllamaOverride,
  provider?: OllamaProvider
): Promise<GenerateNpcCommentResult[]> {
  if (!isNpcGenerationEnabled()) {
    return [{ ok: false, error: NPC_GENERATION_DISABLED_ERROR }];
  }

  let activeProvider = provider;
  if (!activeProvider) {
    const resolved = await ensureCommentProvider(ollama);
    if (!resolved.ok) {
      if (resolved.clientBridge) {
        return [{ ok: false, error: "CLIENT_BRIDGE" }];
      }
      return [{ ok: false, error: resolved.error }];
    }
    activeProvider = resolved.provider;
  }

  const batchSize = clampNpcCommentBatchCount(count);
  const results: GenerateNpcCommentResult[] = [];
  const usedPosts = new Set<number>();
  const usedNpcIds = new Set<string>();

  for (let i = 0; i < batchSize; i++) {
    const result = await generateSingleNpcComment(
      usedPosts,
      usedNpcIds,
      activeProvider
    );
    if (result.ok) {
      if (result.npcId) usedNpcIds.add(result.npcId);
      usedPosts.add(result.postId);
      results.push({
        ok: true,
        author: result.author,
        postId: result.postId,
        commentId: result.commentId,
        pollVote: result.pollVote,
      });
    } else {
      results.push(result);
      if (result.error.includes("Ollama est hors ligne")) break;
    }
  }

  return results;
}
