import { createAdminClient } from "@/lib/supabase/admin";
import { extractMentionUsernames } from "@/lib/mentions";
import type { NotificationKind } from "@/lib/supabase/types";

type CreateNotificationParams = {
  userId: string;
  kind: NotificationKind;
  actorId?: string | null;
  postId?: number | null;
  commentId?: number | null;
};

export async function createNotification({
  userId,
  kind,
  actorId = null,
  postId = null,
  commentId = null,
}: CreateNotificationParams) {
  if (actorId && actorId === userId) return;

  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: userId,
    kind,
    actor_id: actorId,
    post_id: postId,
    comment_id: commentId,
  });
}

export async function createMentionNotifications(
  content: string,
  actorId: string,
  postId?: number | null
) {
  const usernames = extractMentionUsernames(content);
  if (usernames.length === 0) return;

  const admin = createAdminClient();
  const orFilter = usernames
    .map((u) => `username.ilike.${u}`)
    .join(",");

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username")
    .or(orFilter);

  if (!profiles?.length) return;

  const rows = profiles
    .filter((p) => p.id !== actorId)
    .map((p) => ({
      user_id: p.id,
      kind: "mention" as const,
      actor_id: actorId,
      post_id: postId ?? null,
      comment_id: null,
    }));

  if (rows.length === 0) return;
  await admin.from("notifications").insert(rows);
}

export async function createCommentReplyNotifications(
  content: string,
  actorId: string,
  postId: number,
  commentId: number
) {
  const usernames = extractMentionUsernames(content);
  if (usernames.length === 0) return;

  const admin = createAdminClient();
  const orFilter = usernames
    .map((u) => `username.ilike.${u}`)
    .join(",");

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username")
    .or(orFilter);

  if (!profiles?.length) return;

  const rows = profiles
    .filter((p) => p.id !== actorId)
    .map((p) => ({
      user_id: p.id,
      kind: "comment_reply" as const,
      actor_id: actorId,
      post_id: postId,
      comment_id: commentId,
    }));

  if (rows.length === 0) return;
  await admin.from("notifications").insert(rows);
}

export async function createReactionNotification(
  postId: number,
  actorId: string
) {
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post?.author_id || post.author_id === actorId) return;

  await createNotification({
    userId: post.author_id,
    kind: "reaction",
    actorId,
    postId,
  });
}

export async function createCommentLikeNotification(
  commentId: number,
  actorId: string
) {
  const admin = createAdminClient();
  const { data: comment } = await admin
    .from("comments")
    .select("author_id, post_id")
    .eq("id", commentId)
    .maybeSingle();

  if (!comment?.author_id || comment.author_id === actorId) return;

  await createNotification({
    userId: comment.author_id,
    kind: "comment_reaction",
    actorId,
    postId: comment.post_id,
    commentId,
  });
}

export async function createFollowNotification(
  followerId: string,
  followingId: string
) {
  await createNotification({
    userId: followingId,
    kind: "follow",
    actorId: followerId,
  });
}
