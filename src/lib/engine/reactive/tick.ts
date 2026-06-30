import type { OllamaProvider } from "@/lib/ollama-bridge";
import type { OllamaOverride } from "@/lib/ollama-config";
import { resolveOllamaActionContext } from "@/lib/ollama-server";
import { generateEmergentNpcResponseBatch } from "@/lib/engine/reactive/generate-emergent";
import {
  getAmbientFallbackChance,
  getPollVotesPerTick,
  getSignalsPerTick,
} from "@/lib/engine/reactive/tick-config";
import { expireOldSignals } from "@/lib/engine/reactive/signals";
import { checkNarrativeEndgame } from "@/lib/engine/reactive/endgame-stub";
import { isNpcGenerationEnabled } from "@/lib/engine/shared/generation-gate";
import type {
  NarrativeTickMetrics,
  NarrativeTickResult,
} from "@/lib/engine/shared/types";
import { maybeAmbientNpcPollVotes } from "@/lib/engine/content/poll-vote";
import { runAmbientTickPhase } from "@/lib/engine/reactive/tick-ambient";
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
    const pollVotes = await maybeAmbientNpcPollVotes(
      getPollVotesPerTick(),
      provider
    );
    const endgame = await checkNarrativeEndgame();
    return finishTick(
      startedAt,
      {
        handled: true,
        mode: "emergent",
        detail: {
          batch_count: batch.handled,
          poll_votes: pollVotes,
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
    const ambient = await runAmbientTickPhase(options.ollama, provider);
    errors.push(...ambient.errors);

    if (ambient.handled) {
      const endgame = await checkNarrativeEndgame();
      const firstComment = ambient.comments[0];
      const isComment = ambient.kind === "comment_batch";

      return finishTick(
        startedAt,
        {
          handled: true,
          mode: "ambient",
          detail: {
            kind: isComment ? "comment" : "post",
            author: isComment
              ? firstComment?.author
              : ambient.post?.author,
            post_id: isComment
              ? firstComment?.postId
              : ambient.post?.postId,
            comment_id: isComment ? firstComment?.commentId : undefined,
            comment_count: ambient.comments.length,
            poll_votes: ambient.pollVotes,
            batch: ambient.comments.map((c) => ({
              author: c.author,
              post_id: c.postId,
              comment_id: c.commentId,
              poll_vote: c.pollVote,
            })),
            endgame: endgame.triggered ? endgame : undefined,
          },
        },
        {
          signals_attempted: maxSignals,
          signals_handled: 0,
          ambient_reactions: ambient.ambientReactions,
          comment_likes: ambient.commentLikes,
          errors,
        }
      );
    }

    return finishTick(
      startedAt,
      {
        handled: false,
        mode: "none",
        detail: {
          emergent_error: batch.lastError,
          ambient_errors: ambient.errors,
        },
      },
      {
        signals_attempted: maxSignals,
        signals_handled: 0,
        ambient_reactions: ambient.ambientReactions,
        comment_likes: ambient.commentLikes,
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
