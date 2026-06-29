import type { OllamaProvider } from "@/lib/ollama-bridge";
import type { OllamaOverride } from "@/lib/ollama-config";
import { resolveOllamaActionContext } from "@/lib/ollama-server";
import { generateEmergentNpcResponseBatch } from "@/lib/engine/reactive/generate-emergent";
import {
  getAmbientFallbackChance,
  getSignalsPerTick,
} from "@/lib/engine/reactive/tick-config";
import { expireOldSignals } from "@/lib/engine/reactive/signals";
import { checkNarrativeEndgame } from "@/lib/engine/reactive/endgame-stub";
import { isNpcGenerationEnabled } from "@/lib/engine/shared/generation-gate";
import type {
  NarrativeTickMetrics,
  NarrativeTickResult,
} from "@/lib/engine/shared/types";
import { generateNpcCommentsBatch } from "@/lib/engine/ambient/generate-comment";
import { generateNpcPost } from "@/lib/engine/ambient/generate-post";
import { maybeAmbientNpcReactions } from "@/lib/engine/casting/npc-reaction";
import { maybeAmbientNpcCommentLikes } from "@/lib/engine/casting/npc-comment-engagement";
import {
  getOllamaCallCount,
  resetOllamaCallCount,
} from "@/lib/engine/content/ollama";
import { persistLastTickResult } from "@/lib/engine/reactive/tick-metrics";

export type RunNarrativeTickOptions = {
  /** Surcharge le nombre de signaux émergents traités (défaut: NARRATIVE_SIGNALS_PER_TICK). */
  maxSignals?: number;
  provider?: OllamaProvider;
  ollama?: OllamaOverride;
  skipOllamaCheck?: boolean;
};

function buildMetrics(
  startedAt: number,
  partial: Omit<NarrativeTickMetrics, "duration_ms" | "ollama_calls" | "errors"> & {
    errors?: string[];
  }
): NarrativeTickMetrics {
  return {
    duration_ms: Date.now() - startedAt,
    ollama_calls: getOllamaCallCount(),
    errors: partial.errors ?? [],
    signals_attempted: partial.signals_attempted,
    signals_handled: partial.signals_handled,
    ambient_reactions: partial.ambient_reactions,
    comment_likes: partial.comment_likes,
  };
}

function finishTick(
  startedAt: number,
  result: Omit<NarrativeTickResult, "metrics">,
  metricsPartial: Omit<
    NarrativeTickMetrics,
    "duration_ms" | "ollama_calls" | "errors"
  > & { errors?: string[] }
): NarrativeTickResult {
  const finished: NarrativeTickResult = {
    ...result,
    metrics: buildMetrics(startedAt, metricsPartial),
  };
  persistLastTickResult(finished);
  return finished;
}

export async function runNarrativeTick(
  options: RunNarrativeTickOptions = {}
): Promise<NarrativeTickResult> {
  const startedAt = Date.now();
  resetOllamaCallCount();

  if (!isNpcGenerationEnabled()) {
    return finishTick(
      startedAt,
      {
        handled: false,
        mode: "none",
        detail: { skipped: "generation_disabled" },
      },
      { errors: [] }
    );
  }

  let provider = options.provider;
  if (!provider) {
    const ctx = await resolveOllamaActionContext(options.ollama);
    if (!ctx.ok) {
      return finishTick(
        startedAt,
        {
          handled: false,
          mode: "none",
          detail: { error: ctx.error },
        },
        { errors: [ctx.error] }
      );
    }
    if (ctx.clientBridge) {
      return finishTick(
        startedAt,
        {
          handled: false,
          mode: "none",
          detail: { error: "CLIENT_BRIDGE" },
        },
        { errors: ["CLIENT_BRIDGE"] }
      );
    }
    provider = ctx.provider;
  }

  await expireOldSignals();

  const maxSignals = options.maxSignals ?? getSignalsPerTick();
  const batch = await generateEmergentNpcResponseBatch(maxSignals, provider);
  const errors: string[] = [];
  if (batch.lastError) errors.push(batch.lastError);

  if (batch.handled > 0) {
    const first = batch.results[0];
    const endgame = await checkNarrativeEndgame();
    return finishTick(
      startedAt,
      {
        handled: true,
        mode: "emergent",
        detail: {
          batch_count: batch.handled,
          batch: batch.results.map((r) => ({
            author: r.author,
            post_id: r.postId,
            comment_id: r.commentId,
            signal_id: r.signalId,
            response_type: r.responseType,
          })),
          author: first.author,
          post_id: first.postId,
          comment_id: first.commentId,
          signal_id: first.signalId,
          endgame: endgame.triggered ? endgame : undefined,
        },
      },
      {
        signals_attempted: maxSignals,
        signals_handled: batch.handled,
        errors,
      }
    );
  }

  if (Math.random() < getAmbientFallbackChance()) {
    const ambientReactions = await maybeAmbientNpcReactions(2);
    const commentLikes = await maybeAmbientNpcCommentLikes(2);

    const ambient =
      Math.random() < 0.88
        ? (await generateNpcCommentsBatch(
            2 + Math.floor(Math.random() * 2),
            options.ollama,
            provider
          ))[0] ?? { ok: false as const, error: "Aucun commentaire généré." }
        : await generateNpcPost(options.ollama, provider);

    if (ambient.ok) {
      const isComment = "commentId" in ambient;
      const endgame = await checkNarrativeEndgame();
      return finishTick(
        startedAt,
        {
          handled: true,
          mode: "ambient",
          detail: {
            kind: isComment ? "comment" : "post",
            author: ambient.author,
            post_id: ambient.postId,
            comment_id: isComment ? ambient.commentId : undefined,
            endgame: endgame.triggered ? endgame : undefined,
          },
        },
        {
          signals_attempted: maxSignals,
          signals_handled: 0,
          ambient_reactions: ambientReactions,
          comment_likes: commentLikes,
          errors,
        }
      );
    }

    if (ambient.error) errors.push(ambient.error);

    return finishTick(
      startedAt,
      {
        handled: false,
        mode: "none",
        detail: {
          emergent_error: batch.lastError,
          ambient_error: ambient.error,
        },
      },
      {
        signals_attempted: maxSignals,
        signals_handled: 0,
        ambient_reactions: ambientReactions,
        comment_likes: commentLikes,
        errors,
      }
    );
  }

  const endgame = await checkNarrativeEndgame();
  return finishTick(
    startedAt,
    {
      handled: false,
      mode: "none",
      detail: {
        emergent_error: batch.lastError,
        endgame: endgame.triggered ? endgame : undefined,
      },
    },
    {
      signals_attempted: maxSignals,
      signals_handled: 0,
      errors,
    }
  );
}
