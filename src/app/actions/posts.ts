"use server";

import { revalidatePath } from "next/cache";
import { revalidateDataCaches } from "@/lib/queries/shell";
import {
  enqueueHumanCommentSignal,
  enqueueHumanPostSignal,
} from "@/lib/engine/reactive/signals";
import { triggerNarrativeTickAfterAction } from "@/lib/engine/reactive/trigger-tick";
import { isEmergentModeActive } from "@/lib/engine/shared/queries";
import { createMentionNotifications, createCommentReplyNotifications } from "@/lib/notifications";
import { isValidPostType } from "@/lib/post-types";
import { extractEmbedMediaUrls } from "@/lib/embed-media";
import { parsePollJson, validatePollDraft } from "@/lib/polls";
import { insertPostPoll } from "@/lib/queries/posts";
import { isAllowedGiphyUrl } from "@/lib/engine/content/gif-search";
import { requireAuthUser } from "@/lib/queries/shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { maybeNpcLikesOnPostComments } from "@/lib/engine/casting/npc-comment-engagement";
import type { PostMediaType, PostPoll, PostType } from "@/lib/supabase/types";

const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function mediaTypeFromMime(mime: string): PostMediaType | null {
  if (mime === "image/gif") return "gif";
  if (ALLOWED_MEDIA_TYPES.has(mime)) return "image";
  return null;
}

function extensionFromMime(mime: string): string {
  if (mime === "image/gif") return "gif";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function uploadRemoteGiphyGif(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  remoteUrl: string
): Promise<{ media_url: string; media_type: "gif" } | { error: string }> {
  if (!isAllowedGiphyUrl(remoteUrl)) {
    return { error: "URL GIF non autorisée." };
  }

  let buffer: Buffer;
  try {
    const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      return { error: "Impossible de télécharger le GIF." };
    }
    buffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return { error: "Impossible de télécharger le GIF." };
  }

  if (buffer.byteLength > MAX_MEDIA_BYTES) {
    return { error: "GIF trop volumineux (max 2 Mo)." };
  }

  const path = `${userId}/${Date.now()}.gif`;
  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(path, buffer, {
      contentType: "image/gif",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicUrl } = supabase.storage
    .from("post-media")
    .getPublicUrl(path);

  return { media_url: publicUrl.publicUrl, media_type: "gif" };
}

async function shouldNotifyNarrativeQueued(userId: string): Promise<boolean> {
  if (!(await isEmergentModeActive())) return false;

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_npc")
    .eq("id", userId)
    .maybeSingle();

  return profile?.is_npc === false;
}

export async function createPost(formData: FormData) {
  const content = (formData.get("content") as string)?.trim() ?? "";
  const rawType = (formData.get("post_type") as string) ?? "message";
  const post_type: PostType = isValidPostType(rawType) ? rawType : "message";
  const mediaFile = formData.get("media");
  const mediaRemoteUrl = (formData.get("media_remote_url") as string)?.trim() ?? "";
  const pollRaw = (formData.get("poll_json") as string)?.trim() ?? "";
  const pollDraft = parsePollJson(pollRaw);

  const hasMediaFile = mediaFile instanceof File && mediaFile.size > 0;
  const hasRemoteGif = mediaRemoteUrl.length > 0;
  const hasPoll = pollDraft !== null;

  if (hasPoll) {
    const pollError = validatePollDraft(pollDraft);
    if (pollError) return { error: pollError };
    if (!content) return { error: "Ajoutez une question pour le sondage." };
    if (hasMediaFile || hasRemoteGif) {
      return { error: "Un sondage ne peut pas inclure de média." };
    }
    if (extractEmbedMediaUrls(content).length > 0) {
      return { error: "Un sondage ne peut pas inclure de lien média." };
    }
  }

  if (!content && !hasMediaFile && !hasRemoteGif && !hasPoll) {
    return { error: "Ajoutez du texte ou un média." };
  }

  if (hasMediaFile && hasRemoteGif) {
    return { error: "Un seul média par post." };
  }

  if (content.length > 500) {
    return { error: "Post invalide (max 500 caractères)." };
  }

  const auth = await requireAuthUser("Connectez-vous pour poster.");
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { user } = auth;

  let media_url: string | null = null;
  let media_type: PostMediaType | null = null;

  if (mediaFile instanceof File && mediaFile.size > 0) {
    if (mediaFile.size > MAX_MEDIA_BYTES) {
      return { error: "Média trop volumineux (max 2 Mo)." };
    }

    const resolvedType = mediaTypeFromMime(mediaFile.type);
    if (!resolvedType) {
      return { error: "Format non supporté (JPEG, PNG, WebP ou GIF)." };
    }

    const ext = extensionFromMime(mediaFile.type);
    const path = `${user.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await mediaFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(path, buffer, {
        contentType: mediaFile.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: publicUrl } = supabase.storage
      .from("post-media")
      .getPublicUrl(path);

    media_url = publicUrl.publicUrl;
    media_type = resolvedType;
  } else if (hasRemoteGif) {
    const uploaded = await uploadRemoteGiphyGif(supabase, user.id, mediaRemoteUrl);
    if ("error" in uploaded) {
      return { error: uploaded.error };
    }
    media_url = uploaded.media_url;
    media_type = uploaded.media_type;
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      content: content || "",
      post_type,
      media_url,
      media_type,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  let createdPoll: PostPoll | undefined;

  if (post?.id && hasPoll && pollDraft) {
    const pollResult = await insertPostPoll(supabase, post.id, pollDraft);
    if (!pollResult.ok) {
      await supabase.from("posts").delete().eq("id", post.id);
      return { error: pollResult.error };
    }
    createdPoll = pollResult.poll;
  }

  if (post?.id) {
    if (content) {
      await createMentionNotifications(content, user.id, post.id);
    }
    await enqueueHumanPostSignal(user.id, post.id, content, post_type);
    triggerNarrativeTickAfterAction();
  }

  const narrativeQueued = post?.id
    ? await shouldNotifyNarrativeQueued(user.id)
    : false;

  revalidatePath("/");
  revalidateDataCaches();
  return { success: true, postId: post.id, narrativeQueued, poll: createdPoll };
}

export async function createComment(postId: number, formData: FormData) {
  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length > 300) {
    return { error: "Commentaire invalide (max 300 caractères)." };
  }

  const auth = await requireAuthUser("Connectez-vous pour commenter.");
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { user } = auth;

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      content,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (comment?.id) {
    await createCommentReplyNotifications(content, user.id, postId, comment.id);
    await enqueueHumanCommentSignal(user.id, postId, comment.id, content);
    triggerNarrativeTickAfterAction();

    if (Math.random() < 0.65) {
      await maybeNpcLikesOnPostComments(postId, {
        minLikes: 1,
        maxLikes: 3,
        prioritizeCommentId: comment.id,
      });
    }
  }

  const narrativeQueued = comment?.id
    ? await shouldNotifyNarrativeQueued(user.id)
    : false;

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  revalidateDataCaches();
  return { success: true, commentId: comment.id, narrativeQueued };
}

export async function deletePost(postId: number) {
  const auth = await requireAuthUser("Connectez-vous pour supprimer un post.");
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", auth.user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/saved");
  revalidatePath(`/post/${postId}`);
  revalidateDataCaches();
  return { success: true };
}

export async function deleteComment(commentId: number, postId: number) {
  const auth = await requireAuthUser(
    "Connectez-vous pour supprimer un commentaire."
  );
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", auth.user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  revalidateDataCaches();
  return { success: true };
}
