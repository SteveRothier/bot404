import { generateNpcCommentsBatch } from "@/lib/engine/ambient/generate-comment";
import type { GenerateNpcCommentResult } from "@/lib/engine/ambient/generate-comment";
import { generateNpcPost } from "@/lib/engine/ambient/generate-post";
import { maybeAmbientNpcPollVotes } from "@/lib/engine/content/poll-vote";
import { maybeAmbientNpcCommentLikes } from "@/lib/engine/casting/npc-comment-engagement";
import { maybeAmbientNpcReactions } from "@/lib/engine/casting/npc-reaction";
import type { OllamaProvider } from "@/lib/ollama-bridge";
import type { OllamaOverride } from "@/lib/ollama-config";
import {
  getAmbientCommentPreferChance,
  getAmbientCommentsPerTick,
  getPollVotesPerTick,
} from "@/lib/engine/reactive/tick-config";

export type AmbientTickPhaseResult = {
  handled: boolean;
  kind: "comment_batch" | "post" | "none";
  comments: Extract<GenerateNpcCommentResult, { ok: true }>[];
  post?: { author: string; postId: number };
  ambientReactions: number;
  commentLikes: number;
  pollVotes: number;
  errors: string[];
};

export async function runAmbientTickPhase(
  ollama: OllamaOverride | undefined,
  provider: OllamaProvider
): Promise<AmbientTickPhaseResult> {
  const ambientReactions = await maybeAmbientNpcReactions(3);
  const commentLikes = await maybeAmbientNpcCommentLikes(3);
  const errors: string[] = [];

  const preferComment = Math.random() < getAmbientCommentPreferChance();
  const comments: Extract<GenerateNpcCommentResult, { ok: true }>[] = [];
  let post: { author: string; postId: number } | undefined;
  let commentPollVotes = 0;

  if (preferComment) {
    const batch = await generateNpcCommentsBatch(
      getAmbientCommentsPerTick(),
      ollama,
      provider
    );
    for (const item of batch) {
      if (item.ok) {
        comments.push(item);
        if (item.pollVote) commentPollVotes += 1;
      } else if (item.error) {
        errors.push(item.error);
      }
    }
  } else {
    const generated = await generateNpcPost(ollama, provider);
    if (generated.ok) {
      post = { author: generated.author, postId: generated.postId };
    } else if (generated.error) {
      errors.push(generated.error);
    }
  }

  const extraPollVotes = await maybeAmbientNpcPollVotes(
    getPollVotesPerTick(),
    provider
  );

  return {
    handled: comments.length > 0 || post !== undefined,
    kind: comments.length > 0 ? "comment_batch" : post ? "post" : "none",
    comments,
    post,
    ambientReactions,
    commentLikes,
    pollVotes: commentPollVotes + extraPollVotes,
    errors,
  };
}
