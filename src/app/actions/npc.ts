"use server";

import { revalidatePath } from "next/cache";
import { revalidateDataCaches } from "@/lib/queries/shell";
import { requireAuthUser } from "@/lib/queries/shell";
import {
  clampNpcCommentBatchCount,
  commitNpcCommentGeneration,
  generateNpcComment,
  generateNpcCommentsBatch,
  prepareNpcCommentGeneration,
} from "@/lib/engine/ambient/generate-comment";
import {
  clampNpcPostBatchCount,
  commitNpcPostGeneration,
  generateNpcPost,
  generateNpcPostsBatch,
  prepareNpcPostGeneration,
} from "@/lib/engine/ambient/generate-post";
import { getNpcMediaStatus } from "@/lib/engine/content/media";
import {
  NPC_GENERATION_DISABLED_ERROR,
  isNpcGenerationEnabled,
} from "@/lib/engine/shared/generation-gate";
import { runNarrativeTick } from "@/lib/engine/reactive/tick";
import type { OllamaOverride } from "@/lib/ollama-config";
import { resolveOllamaActionContext } from "@/lib/ollama-server";

export async function getNpcMediaStatusAction() {
  return getNpcMediaStatus();
}

function tickProducedPost(detail: Record<string, unknown> | undefined): boolean {
  if (!detail) return false;
  if (detail.kind === "comment") return false;

  const batch = detail.batch as
    | Array<{ response_type?: string }>
    | undefined;
  if (batch?.length) {
    return batch[0].response_type === "post";
  }

  if (detail.kind === "post") return true;
  return detail.comment_id == null;
}

function tickProducedComment(detail: Record<string, unknown> | undefined): boolean {
  if (!detail) return false;
  if (detail.kind === "comment") return true;

  const batch = detail.batch as
    | Array<{ response_type?: string; comment_id?: number }>
    | undefined;
  if (batch?.length) {
    return batch[0].response_type === "comment" || batch[0].comment_id != null;
  }

  return detail.comment_id != null;
}

function tickPostFromDetail(detail: Record<string, unknown> | undefined): {
  postId?: number;
  commentId?: number;
  author?: string;
} | null {
  if (!detail) return null;

  const batch = detail.batch as
    | Array<{ post_id?: number; comment_id?: number; author?: string }>
    | undefined;
  if (batch?.[0]) {
    const b = batch[0];
    return {
      postId: b.post_id,
      commentId: b.comment_id ?? undefined,
      author: b.author,
    };
  }

  const postId = detail.post_id as number | undefined;
  const commentId = detail.comment_id as number | undefined;
  const author = detail.author as string | undefined;
  if (postId) return { postId, commentId, author };
  return null;
}

async function revalidateAfterNpcAction(postId?: number) {
  revalidatePath("/");
  if (postId) revalidatePath(`/post/${postId}`);
  revalidatePath("/trending");
  revalidateDataCaches();
}

type BatchActionResult = {
  success: true;
  generated: number;
  author: string;
  postId: number;
  commentId?: number;
  pollVotes?: number;
};

export async function prepareNpcPostAction() {
  const auth = await requireAuthUser(
    "Connectez-vous pour utiliser la génération NPC."
  );
  if ("error" in auth) return { error: auth.error };

  if (!isNpcGenerationEnabled()) {
    return { error: NPC_GENERATION_DISABLED_ERROR };
  }

  const prep = await prepareNpcPostGeneration();
  if (!prep.ok) return { error: prep.error };

  return {
    prepareToken: prep.prepareToken,
    system: prep.system,
    user: prep.user,
    profile: prep.profile,
    postType: prep.postType,
  };
}

export async function commitNpcPostAction(
  prepareToken: string,
  rawContent: string
) {
  const auth = await requireAuthUser(
    "Connectez-vous pour utiliser la génération NPC."
  );
  if ("error" in auth) return { error: auth.error };

  const result = await commitNpcPostGeneration(prepareToken, rawContent);
  if (!result.ok) return { error: result.error };

  await revalidateAfterNpcAction(result.postId);
  return {
    success: true as const,
    author: result.author,
    postId: result.postId,
  };
}

export async function prepareNpcCommentAction() {
  const auth = await requireAuthUser(
    "Connectez-vous pour utiliser la génération NPC."
  );
  if ("error" in auth) return { error: auth.error };

  if (!isNpcGenerationEnabled()) {
    return { error: NPC_GENERATION_DISABLED_ERROR };
  }

  const prep = await prepareNpcCommentGeneration();
  if (!prep.ok) return { error: prep.error };

  return {
    prepareToken: prep.prepareToken,
    system: prep.system,
    user: prep.user,
  };
}

export async function commitNpcCommentAction(
  prepareToken: string,
  rawContent: string
) {
  const auth = await requireAuthUser(
    "Connectez-vous pour utiliser la génération NPC."
  );
  if ("error" in auth) return { error: auth.error };

  const result = await commitNpcCommentGeneration(prepareToken, rawContent);
  if (!result.ok) return { error: result.error };

  await revalidateAfterNpcAction(result.postId);
  return {
    success: true as const,
    author: result.author,
    postId: result.postId,
    commentId: result.commentId,
  };
}

export async function generateNpcPostAction(
  count = 1,
  ollama?: OllamaOverride
) {
  const auth = await requireAuthUser(
    "Connectez-vous pour utiliser la génération NPC."
  );
  if ("error" in auth) return { error: auth.error };

  if (!isNpcGenerationEnabled()) {
    return { error: NPC_GENERATION_DISABLED_ERROR };
  }

  const batchSize = clampNpcPostBatchCount(count);

  const ctx = await resolveOllamaActionContext(ollama);
  if (!ctx.ok) return { error: ctx.error };
  if (ctx.clientBridge) {
    return { error: "CLIENT_BRIDGE" as const };
  }

  try {
    if (batchSize === 1) {
      const tick = await runNarrativeTick({ ollama });
      if (tick.handled) {
        const detail = tick.detail as Record<string, unknown> | undefined;
        if (
          (tick.mode === "emergent" || tick.mode === "ambient") &&
          tickProducedPost(detail)
        ) {
          const extracted = tickPostFromDetail(detail);
          if (extracted?.postId) {
            await revalidateAfterNpcAction();
            return {
              success: true,
              generated: 1,
              author: extracted.author ?? "NPC",
              postId: extracted.postId,
            } satisfies BatchActionResult;
          }
        }
      }
    }

    const results = await generateNpcPostsBatch(batchSize, ollama);
    const successes = results.filter((r) => r.ok);
    if (successes.length === 0) {
      const firstError = results.find((r) => !r.ok);
      if (firstError && !firstError.ok && firstError.error === "CLIENT_BRIDGE") {
        return { error: "CLIENT_BRIDGE" as const };
      }
      return { error: firstError?.error ?? "Échec de la génération." };
    }

    await revalidateAfterNpcAction(successes[0].postId);
    return {
      success: true,
      generated: successes.length,
      author: successes[0].author,
      postId: successes[0].postId,
    } satisfies BatchActionResult;
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur lors de la génération.";
    return { error: message };
  }
}

export async function generateNpcCommentAction(
  count = 1,
  ollama?: OllamaOverride
) {
  const auth = await requireAuthUser(
    "Connectez-vous pour utiliser la génération NPC."
  );
  if ("error" in auth) return { error: auth.error };

  if (!isNpcGenerationEnabled()) {
    return { error: NPC_GENERATION_DISABLED_ERROR };
  }

  const batchSize = clampNpcCommentBatchCount(count);

  const ctx = await resolveOllamaActionContext(ollama);
  if (!ctx.ok) return { error: ctx.error };
  if (ctx.clientBridge) {
    return { error: "CLIENT_BRIDGE" as const };
  }

  try {
    if (batchSize === 1) {
      const tick = await runNarrativeTick({ ollama });
      if (tick.handled) {
        const detail = tick.detail as Record<string, unknown> | undefined;
        if (
          (tick.mode === "emergent" || tick.mode === "ambient") &&
          tickProducedComment(detail)
        ) {
          const extracted = tickPostFromDetail(detail);
          const commentId = extracted?.commentId;
          const postId = extracted?.postId;
          const author = extracted?.author ?? "NPC";

          if (commentId && postId) {
            await revalidateAfterNpcAction(postId);
            return {
              success: true,
              generated: 1,
              author,
              postId,
              commentId,
              pollVotes: 0,
            } satisfies BatchActionResult;
          }
        }
      }
    }

    const results =
      batchSize === 1
        ? [await generateNpcComment(ollama)]
        : await generateNpcCommentsBatch(batchSize, ollama);

    const successes = results.filter((r) => r.ok);
    if (successes.length === 0) {
      const firstError = results.find((r) => !r.ok);
      if (firstError && !firstError.ok && firstError.error === "CLIENT_BRIDGE") {
        return { error: "CLIENT_BRIDGE" as const };
      }
      return { error: firstError?.error ?? "Échec de la génération." };
    }

    const pollVotes = successes.filter((r) => r.ok && r.pollVote).length;

    await revalidateAfterNpcAction(successes[0].postId);
    return {
      success: true,
      generated: successes.length,
      author: successes[0].author,
      postId: successes[0].postId,
      commentId: successes[0].commentId,
      pollVotes,
    } satisfies BatchActionResult;
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur lors de la génération.";
    return { error: message };
  }
}
