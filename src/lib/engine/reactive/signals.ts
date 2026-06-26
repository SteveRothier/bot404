import { extractMentionUsernames } from "@/lib/mentions";
import { suspicionScoreForContent } from "@/lib/engine/shared/hunt-keywords";
import type { NarrativeSignalKind } from "@/lib/engine/shared/types";
import {
  priorityForPost,
  priorityForReactionSignal,
} from "@/lib/engine/reactive/signal-priority";
import type { PostType, ReactionKind } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { priorityForHumanJoined } from "@/lib/engine/reactive/welcome-human";

const SIGNAL_TTL_MS = 48 * 60 * 60 * 1000;
export const MAX_SIGNAL_ATTEMPTS = 3;

async function isHumanUser(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_npc")
    .eq("id", userId)
    .maybeSingle();

  return data?.is_npc === false;
}

async function enqueueSignal(input: {
  kind: NarrativeSignalKind;
  authorId: string;
  postId?: number | null;
  commentId?: number | null;
  reactionKind?: string | null;
  mentionedUsername?: string | null;
  priority: number;
  payload?: Record<string, unknown>;
}) {
  if (!(await isHumanUser(input.authorId))) return;

  const supabase = createAdminClient();
  await supabase.from("narrative_signals").insert({
    kind: input.kind,
    author_id: input.authorId,
    post_id: input.postId ?? null,
    comment_id: input.commentId ?? null,
    reaction_kind: input.reactionKind ?? null,
    mentioned_username: input.mentionedUsername ?? null,
    priority: input.priority,
    payload: input.payload ?? {},
  });
}

export async function enqueueHumanPostSignal(
  authorId: string,
  postId: number,
  content: string,
  postType: PostType
) {
  await enqueueSignal({
    kind: "human_post",
    authorId,
    postId,
    priority: priorityForPost(postType),
    payload: {
      content,
      post_type: postType,
      suspicion_score: suspicionScoreForContent(content),
    },
  });

  await enqueueMentionSignals(authorId, content, postId, null);
}

export async function enqueueHumanCommentSignal(
  authorId: string,
  postId: number,
  commentId: number,
  content: string
) {
  await enqueueSignal({
    kind: "human_comment",
    authorId,
    postId,
    commentId,
    priority: 32,
    payload: { content, suspicion_score: suspicionScoreForContent(content) },
  });

  await enqueueMentionSignals(authorId, content, postId, commentId);
}

export async function enqueueReactionSignal(
  authorId: string,
  postId: number,
  kind: ReactionKind
) {
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "content, post_type, author:profiles!author_id(is_npc, username)"
    )
    .eq("id", postId)
    .maybeSingle();

  if (!post) return;

  const authorRaw = post.author;
  const postAuthor = (
    Array.isArray(authorRaw) ? authorRaw[0] : authorRaw
  ) as { is_npc: boolean; username: string } | null;

  const postType = post.post_type as PostType;
  const content = (post.content ?? "").slice(0, 500);

  await enqueueSignal({
    kind: "reaction",
    authorId,
    postId,
    reactionKind: kind,
    priority: priorityForReactionSignal(kind, postType),
    payload: {
      reaction: kind,
      post_type: postType,
      content,
      post_author_is_npc: postAuthor?.is_npc ?? true,
      post_author_username: postAuthor?.username ?? null,
      suspicion_score: suspicionScoreForContent(content),
    },
  });
}

async function enqueueMentionSignals(
  authorId: string,
  content: string,
  postId: number,
  commentId: number | null
) {
  const usernames = extractMentionUsernames(content);
  if (usernames.length === 0) return;

  const supabase = createAdminClient();

  for (const raw of usernames) {
    const { data: npc } = await supabase
      .from("profiles")
      .select("username")
      .eq("is_npc", true)
      .ilike("username", raw)
      .maybeSingle();

    if (!npc) continue;

    await enqueueSignal({
      kind: "mention",
      authorId,
      postId,
      commentId,
      mentionedUsername: npc.username,
      priority: 45,
      payload: { content, mentioned: npc.username },
    });
  }

}

export async function expireOldSignals() {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - SIGNAL_TTL_MS).toISOString();
  await supabase
    .from("narrative_signals")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("created_at", cutoff);
}

export async function recordSignalFailure(signalId: number): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("narrative_signals")
    .select("attempt_count")
    .eq("id", signalId)
    .eq("status", "pending")
    .maybeSingle();

  if (!row) return false;

  const nextAttempt = (row.attempt_count ?? 0) + 1;
  if (nextAttempt >= MAX_SIGNAL_ATTEMPTS) {
    await supabase
      .from("narrative_signals")
      .update({
        status: "failed",
        attempt_count: nextAttempt,
        result: { error: "max_attempts" },
      })
      .eq("id", signalId);
    return true;
  }

  await supabase
    .from("narrative_signals")
    .update({ attempt_count: nextAttempt })
    .eq("id", signalId);
  return false;
}

export async function getPendingSignals(limit = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("narrative_signals")
    .select(
      "id, kind, priority, status, attempt_count, created_at, payload, post_id"
    )
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

const WELCOME_BEATS = ["welcome", "suspicion", "rumor", "archive"] as const;

/** Enfile la vague d'accueil (4 signaux human_joined) — idempotent côté SQL. */
export async function enqueueHumanWelcomeWave(
  userId: string,
  username: string
): Promise<{ inserted: boolean }> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("narrative_signals")
    .select("id")
    .eq("author_id", userId)
    .eq("kind", "human_joined")
    .limit(1)
    .maybeSingle();

  if (existing) return { inserted: false };

  await supabase
    .from("profiles")
    .update({
      welcome_focus_until: new Date(
        Date.now() + 48 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq("id", userId);

  const rows = WELCOME_BEATS.map((beat, waveIndex) => ({
    kind: "human_joined" as const,
    author_id: userId,
    priority: priorityForHumanJoined(waveIndex),
    payload: { username, beat, wave_index: waveIndex },
  }));

  const { error } = await supabase.from("narrative_signals").insert(rows);
  if (error) throw new Error(error.message);

  return { inserted: true };
}
