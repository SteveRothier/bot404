import { checkNarrativeEndgame } from "@/lib/engine/reactive/endgame-stub";
import { expireOldSignals } from "@/lib/engine/reactive/signals";
import { getAmbientFallbackChance } from "@/lib/engine/reactive/tick-config";
import { runAmbientTickPhase } from "@/lib/engine/reactive/tick-ambient";
import { persistLastTickResult } from "@/lib/engine/reactive/tick-metrics";
import {
  getOllamaCallCount,
  resetOllamaCallCount,
} from "@/lib/engine/content/ollama";
import type { NarrativeTickResult } from "@/lib/engine/shared/types";
import type { OllamaProvider } from "@/lib/ollama-bridge";
import {
  createQueuedOllamaProvider,
  OllamaSuspendError,
  type OllamaChatRequest,
} from "@/lib/ollama-bridge";
import { signBridgePayload, verifyBridgePayload } from "@/lib/ollama-bridge-token";
import type { OllamaOverride } from "@/lib/ollama-config";
import { runNarrativeTick } from "@/lib/engine/reactive/tick";
import { resolveOllamaActionContext } from "@/lib/ollama-server";

export type TickOrchestratorStep =
  | {
      status: "need_ollama";
      stateToken: string;
      call: OllamaChatRequest;
    }
  | { status: "complete"; result: NarrativeTickResult }
  | { status: "error"; error: string };

type BridgeTickPhase = "init" | "ambient" | "done";

type BridgeTickSession = {
  v: 2;
  phase: BridgeTickPhase;
  startedAt: number;
  maxSignals: number;
  ollamaResponses: (string | null)[];
  ambientRoll?: number;
  errors: string[];
  ollama?: OllamaOverride;
};

function encodeSession(state: BridgeTickSession): string {
  return signBridgePayload(state);
}

function decodeSession(token: string): BridgeTickSession | null {
  const payload = verifyBridgePayload<BridgeTickSession>(token);
  if (!payload || payload.v !== 2) return null;
  return payload;
}

function finishBridgeTick(
  startedAt: number,
  result: Omit<NarrativeTickResult, "metrics">,
  errors: string[]
): NarrativeTickResult {
  const finished: NarrativeTickResult = {
    ...result,
    metrics: {
      duration_ms: Date.now() - startedAt,
      ollama_calls: getOllamaCallCount(),
      errors,
      signals_attempted: 0,
      signals_handled: 0,
    },
  };
  persistLastTickResult(finished);
  return finished;
}

async function runBridgeAmbientPhase(
  session: BridgeTickSession,
  provider: OllamaProvider
): Promise<TickOrchestratorStep> {
  const ambientRoll =
    session.ambientRoll ?? (session.ambientRoll = Math.random());

  if (ambientRoll >= getAmbientFallbackChance()) {
    const endgame = await checkNarrativeEndgame();
    return {
      status: "complete",
      result: finishBridgeTick(
        session.startedAt,
        {
          handled: false,
          mode: "none",
          detail: { bridge: true, endgame: endgame.triggered ? endgame : undefined },
        },
        session.errors
      ),
    };
  }

  const ambient = await runAmbientTickPhase(session.ollama, provider);
  session.errors.push(...ambient.errors);

  if (ambient.handled) {
    const endgame = await checkNarrativeEndgame();
    const firstComment = ambient.comments[0];
    const isComment = ambient.kind === "comment_batch";

    return {
      status: "complete",
      result: finishBridgeTick(
        session.startedAt,
        {
          handled: true,
          mode: "ambient",
          detail: {
            bridge: true,
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
        session.errors
      ),
    };
  }

  return {
    status: "complete",
    result: finishBridgeTick(
      session.startedAt,
      {
        handled: false,
        mode: "none",
        detail: { bridge: true, ambient_errors: ambient.errors },
      },
      session.errors
    ),
  };
}

async function continueBridgeTick(
  session: BridgeTickSession
): Promise<TickOrchestratorStep> {
  resetOllamaCallCount();
  const callIndexRef = { current: 0 };

  const provider = createQueuedOllamaProvider(
    session.ollamaResponses,
    callIndexRef
  );

  try {
    if (session.phase === "init") {
      await expireOldSignals();
      session.phase = "ambient";
    }

    if (session.phase === "ambient") {
      return await runBridgeAmbientPhase(session, provider);
    }

    return { status: "error", error: "Session tick invalide." };
  } catch (error) {
    if (error instanceof OllamaSuspendError) {
      return {
        status: "need_ollama",
        stateToken: encodeSession(session),
        call: error.call,
      };
    }
    const message = error instanceof Error ? error.message : "Échec du tick.";
    return { status: "error", error: message };
  }
}

export async function runManualTickOrchestratorStep(
  stateToken: string | null,
  ollamaText: string | null,
  options: { maxSignals?: number; ollama?: OllamaOverride } = {}
): Promise<TickOrchestratorStep> {
  let session: BridgeTickSession;

  if (stateToken) {
    const decoded = decodeSession(stateToken);
    if (!decoded) {
      return { status: "error", error: "Session tick expirée ou invalide." };
    }
    session = decoded;
    if (ollamaText !== null) {
      session.ollamaResponses.push(ollamaText);
    }
  } else {
    session = {
      v: 2,
      phase: "init",
      startedAt: Date.now(),
      maxSignals: options.maxSignals ?? 2,
      ollamaResponses: [],
      errors: [],
      ollama: options.ollama,
    };
  }

  return continueBridgeTick(session);
}

export async function runManualTickWithOllama(
  ollama?: OllamaOverride,
  maxSignals = 2
): Promise<TickOrchestratorStep> {
  const ctx = await resolveOllamaActionContext(ollama);
  if (!ctx.ok) {
    return { status: "error", error: ctx.error };
  }

  if (ctx.clientBridge) {
    return runManualTickOrchestratorStep(null, null, { maxSignals, ollama });
  }

  const result = await runNarrativeTick({ maxSignals, ollama });
  return { status: "complete", result };
}
