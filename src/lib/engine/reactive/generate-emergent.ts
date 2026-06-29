import {
  buildEmergentPostPrompt,
  buildEmergentPrompt,
} from "@/lib/engine/reactive/build-prompt";
import { shouldEmergentNpcPost } from "@/lib/engine/reactive/emergent-response-mode";
import { getEmergentArcSynopsis } from "@/lib/engine/shared/queries";
import { isEmergentModeActive } from "@/lib/engine/shared/queries";
import { reactionActionLabel } from "@/lib/engine/content/prompt-labels";
import type { NarrativeSignal } from "@/lib/engine/shared/types";
import { processHumanJoinedSignal } from "@/lib/engine/reactive/welcome-human";
import { pickNpcForSignal } from "@/lib/engine/casting/cast";
import { contentHasHuntKeywords } from "@/lib/engine/shared/hunt-keywords";
import { recordSignalFailure } from "@/lib/engine/reactive/signals";
import { maybeNpcVoteOnPoll } from "@/lib/engine/content/poll-vote";
import { maybeAttachNpcPoll } from "@/lib/engine/content/poll-create";
import { resolveNpcPostMedia, shouldAttachMediaToNpcPost } from "@/lib/engine/content/media";
import { ollamaChat } from "@/lib/engine/content/ollama";
import { getRecentNpcAuthorIdsOnPost } from "@/lib/engine/casting/recent-repliers";
import { loadAllNpcs } from "@/lib/engine/casting/select-npc";
import { buildRichThreadSnippet } from "@/lib/engine/casting/thread-context";
import { maybeNpcReactionsOnPost } from "@/lib/engine/casting/npc-reaction";
import { maybeNpcLikesOnPostComments } from "@/lib/engine/casting/npc-comment-engagement";
import { validateNpcCommentContent, validateNpcPostContent } from "@/lib/engine/content/validate-content";
import { withReplyMention } from "@/lib/mentions";
import { createCommentReplyNotifications } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType, Profile, ReactionKind } from "@/lib/supabase/types";

export type EmergentResponseSuccess = {
  ok: true;
  author: string;
  postId: number;
  commentId: number | null;
  signalId: number;
  responseType: "comment" | "post";
};

export type EmergentResponseResult =
  | EmergentResponseSuccess
  | { ok: false; error: string };

async function loadSignalContext(signal: NarrativeSignal) {
  const supabase = createAdminClient();

  const { data: author } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", signal.author_id)
    .maybeSingle();

  let content = "";
  let postId = signal.post_id;
  let actionLabel = "interagir sur le réseau";
  let pollLabels: string[] = [];

  if (signal.kind === "human_post" && signal.post_id) {
    const { data: post } = await supabase
      .from("posts")
      .select("content, post_type")
      .eq("id", signal.post_id)
      .maybeSingle();
    content = post?.content ?? "";
    actionLabel = `publier un ${post?.post_type ?? "post"}`;

    const { data: poll } = await supabase
      .from("post_polls")
      .select("ends_at")
      .eq("post_id", signal.post_id)
      .maybeSingle();

    if (poll && new Date(poll.ends_at).getTime() > Date.now()) {
      const { data: options } = await supabase
        .from("post_poll_options")
        .select("label")
        .eq("post_id", signal.post_id)
        .order("position", { ascending: true });
      pollLabels = options?.map((o) => o.label) ?? [];
    }
  } else if (signal.kind === "human_comment" && signal.comment_id) {
    const { data: comment } = await supabase
      .from("comments")
      .select("content, post_id")
      .eq("id", signal.comment_id)
      .maybeSingle();
    content = comment?.content ?? "";
    postId = comment?.post_id ?? postId;
    actionLabel = "commenter";

    if (postId) {
      const { data: parentPost } = await supabase
        .from("posts")
        .select("post_type")
        .eq("id", postId)
        .maybeSingle();
      if (parentPost?.post_type) {
        signal.payload = {
          ...signal.payload,
          post_type: parentPost.post_type,
        };
      }
    }
  } else if (signal.kind === "reaction" && signal.post_id) {
    const payloadContent =
      typeof signal.payload.content === "string" ? signal.payload.content : "";
    const payloadPostType =
      typeof signal.payload.post_type === "string"
        ? signal.payload.post_type
        : null;

    if (payloadContent && payloadPostType) {
      content = payloadContent;
      actionLabel =
        signal.reaction_kind && signal.reaction_kind !== "relay"
          ? reactionActionLabel(signal.reaction_kind as ReactionKind, payloadPostType as PostType)
          : `${signal.reaction_kind ?? "réagir à"} un post (${payloadPostType})`;
    } else {
      const { data: post } = await supabase
        .from("posts")
        .select("content, post_type")
        .eq("id", signal.post_id)
        .maybeSingle();
      content = post?.content ?? "";
      const pt = (post?.post_type ?? "message") as PostType;
      if (post?.post_type) {
        signal.payload = { ...signal.payload, post_type: post.post_type };
      }
      if (signal.reaction_kind && signal.reaction_kind !== "relay") {
        actionLabel = reactionActionLabel(
          signal.reaction_kind as ReactionKind,
          pt
        );
      } else {
        actionLabel = `${signal.reaction_kind ?? "réagir à"} un post (${pt})`;
      }
    }
  } else if (signal.kind === "mention") {
    content =
      typeof signal.payload.content === "string" ? signal.payload.content : "";
    actionLabel = `mentionner @${signal.mentioned_username ?? "NPC"}`;
  }

  return {
    humanUsername: author?.username ?? "humain",
    content,
    postId,
    actionLabel,
    pollLabels,
  };
}

async function pickResponderNpc(
  signal: NarrativeSignal,
  targetPostId: number,
  humanContent: string
): Promise<Profile | null> {
  const supabase = createAdminClient();

  if (signal.mentioned_username) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", signal.mentioned_username)
      .eq("is_npc", true)
      .maybeSingle();
    if (data) return data as Profile;
  }

  const excludeIds = await getRecentNpcAuthorIdsOnPost(targetPostId);
  const npcs = await loadAllNpcs();
  return pickNpcForSignal(npcs, {
    signal,
    humanContent,
    excludeNpcIds: excludeIds,
    huntContent: contentHasHuntKeywords(humanContent),
  });
}

async function applyNpcReactionsAfterEmergent(targetPostId: number) {
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select("author_id, post_type, content")
    .eq("id", targetPostId)
    .maybeSingle();

  if (!post) return;

  await maybeNpcReactionsOnPost(targetPostId, {
    humanAuthorId: post.author_id,
    postType: (post.post_type ?? "message") as PostType,
    postContent: post.content,
    minCount: 1,
    maxCount: 4,
  });

  if (Math.random() < 0.7) {
    await maybeNpcLikesOnPostComments(targetPostId, {
      minLikes: 1,
      maxLikes: 3,
    });
  }
}

export async function processEmergentSignal(
  typedSignal: NarrativeSignal
): Promise<EmergentResponseResult> {
  const supabase = createAdminClient();

  async function fail(error: string): Promise<EmergentResponseResult> {
    await recordSignalFailure(typedSignal.id);
    return { ok: false, error };
  }

  if (typedSignal.kind === "human_joined") {
    const welcome = await processHumanJoinedSignal(typedSignal);
    if (!welcome.ok) return fail(welcome.error);
    return {
      ok: true,
      author: welcome.author,
      postId: welcome.postId,
      commentId: null,
      signalId: welcome.signalId,
      responseType: "post",
    };
  }

  const ctx = await loadSignalContext(typedSignal);

  if (!ctx.postId) {
    await supabase
      .from("narrative_signals")
      .update({ status: "expired" })
      .eq("id", typedSignal.id);
    return fail("Signal sans post cible.");
  }

  const targetPostId = ctx.postId;
  const npc = await pickResponderNpc(
    typedSignal,
    targetPostId,
    ctx.content
  );
  if (!npc) return fail("Aucun NPC disponible.");

  if (
    typedSignal.kind === "human_post" &&
    ctx.pollLabels.length > 0
  ) {
    await maybeNpcVoteOnPoll(targetPostId, npc, ctx.content);
  }

  const threadSnippet = await buildRichThreadSnippet(targetPostId);
  const synopsis = await getEmergentArcSynopsis();
  const respondWithPost = shouldEmergentNpcPost(typedSignal);

  if (respondWithPost) {
    const postType: PostType = "message";

    const { system, user } = await buildEmergentPostPrompt(npc, {
      humanUsername: ctx.humanUsername,
      actionLabel: ctx.actionLabel,
      content: ctx.content,
      threadSnippet,
      emergentSynopsis: synopsis,
    });

    const raw = await ollamaChat(system, user, 400, "default");
    const content = raw
      ? validateNpcPostContent(raw, postType, ctx.content)
      : null;
    if (!content) {
      return fail("Échec génération Ollama.");
    }

    const media = shouldAttachMediaToNpcPost(npc, postType)
      ? await resolveNpcPostMedia(npc, content, postType)
      : null;

    const { data: newPost, error: postError } = await supabase
      .from("posts")
      .insert({
        author_id: npc.id,
        content: content.slice(0, 500),
        post_type: postType,
        narrative_signal_id: typedSignal.id,
        likes_count: Math.floor(Math.random() * 80) + 10,
        media_url: media?.media_url ?? null,
        media_type: media?.media_type ?? null,
      })
      .select("id")
      .single();

    if (postError || !newPost) {
      return fail(postError?.message ?? "Insert post failed");
    }

    await supabase
      .from("narrative_signals")
      .update({
        status: "handled",
        handled_at: new Date().toISOString(),
        result: {
          post_id: newPost.id,
          response_type: "post",
          author: npc.username,
          trigger_post_id: targetPostId,
          npc_id: npc.id,
        },
      })
      .eq("id", typedSignal.id);

    await supabase
      .from("profiles")
      .update({ popularity_score: (npc.popularity_score ?? 0) + 2 })
      .eq("id", npc.id);

    await maybeAttachNpcPoll({
      supabase,
      postId: newPost.id,
      npc,
      content: content.slice(0, 500),
      postType,
      hasMedia: !!media,
      context: "emergent",
    });

    await applyNpcReactionsAfterEmergent(targetPostId);

    return {
      ok: true,
      author: npc.username,
      postId: newPost.id,
      commentId: null,
      signalId: typedSignal.id,
      responseType: "post",
    };
  }

  const reactionKind =
    typedSignal.kind === "reaction"
      ? (typedSignal.reaction_kind as ReactionKind | null)
      : null;
  const emergentPostType =
    typeof typedSignal.payload.post_type === "string"
      ? (typedSignal.payload.post_type as PostType)
      : null;
  const postAuthorIsNpc = typedSignal.payload.post_author_is_npc !== false;

  const { system, user } = await buildEmergentPrompt(npc, {
    humanUsername: ctx.humanUsername,
    actionLabel: ctx.actionLabel,
    content:
      ctx.pollLabels.length > 0
        ? `${ctx.content}\n\nSondage : ${ctx.pollLabels.join(" | ")}`
        : ctx.content,
    threadSnippet,
    emergentSynopsis: synopsis,
    reactionKind,
    postType: emergentPostType,
    postAuthorIsNpc,
  });

  const rawComment = await ollamaChat(system, user, 300, "comment");
  const validatedComment = rawComment
    ? validateNpcCommentContent(rawComment, ctx.content)
    : null;
  if (!validatedComment) {
    return fail("Échec génération Ollama.");
  }

  const commentContent =
    typedSignal.kind === "human_comment"
      ? withReplyMention(validatedComment, ctx.humanUsername)
      : validatedComment;

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_id: targetPostId,
      author_id: npc.id,
      content: commentContent.slice(0, 300),
      narrative_signal_id: typedSignal.id,
    })
    .select("id")
    .single();

  if (error || !comment) {
    return fail(error?.message ?? "Insert comment failed");
  }

  await supabase
    .from("narrative_signals")
    .update({
      status: "handled",
      handled_at: new Date().toISOString(),
      result: {
        comment_id: comment.id,
        response_type: "comment",
        author: npc.username,
        post_id: targetPostId,
        trigger_post_id: targetPostId,
        npc_id: npc.id,
      },
    })
    .eq("id", typedSignal.id);

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  if (typedSignal.kind === "human_comment" && comment?.id) {
    await createCommentReplyNotifications(
      commentContent,
      npc.id,
      targetPostId,
      comment.id
    );
  }

  await applyNpcReactionsAfterEmergent(targetPostId);

  return {
    ok: true,
    author: npc.username,
    postId: targetPostId,
    commentId: comment.id,
    signalId: typedSignal.id,
    responseType: "comment",
  };
}

async function fetchTopPendingSignal() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("narrative_signals")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function generateEmergentNpcResponseBatch(
  maxCount: number
): Promise<{
  handled: number;
  results: EmergentResponseSuccess[];
  lastError: string | null;
}> {
  const emergentActive = await isEmergentModeActive();
  if (!emergentActive) {
    return { handled: 0, results: [], lastError: "Mode émergent inactif." };
  }

  const results: EmergentResponseSuccess[] = [];
  let lastError: string | null = null;

  for (let i = 0; i < maxCount; i++) {
    const signal = await fetchTopPendingSignal();

    if (!signal) {
      lastError = "Aucun signal en attente.";
      break;
    }

    const outcome = await processEmergentSignal(signal as NarrativeSignal);
    if (!outcome.ok) {
      lastError = outcome.error;
      if (
        outcome.error === "Aucun signal en attente." ||
        outcome.error === "Signal sans post cible."
      ) {
        break;
      }
      continue;
    }
    results.push(outcome);
  }

  return { handled: results.length, results, lastError };
}
