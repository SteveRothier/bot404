"use server";

import { revalidatePath } from "next/cache";
import { revalidateDataCaches } from "@/lib/queries/cache-tags";
import { checkNpcCooldown, setNpcCooldown } from "@/lib/npc/cooldown";
import { generateNpcComment } from "@/lib/npc/generate-comment";
import { generateNpcPost } from "@/lib/npc/generate-post";
import { getNpcMediaStatus } from "@/lib/npc/media";
import { runNarrativeTick } from "@/lib/narrative/tick";
import { createClient } from "@/lib/supabase/server";

export async function getNpcMediaStatusAction() {
  return getNpcMediaStatus();
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

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Connectez-vous pour utiliser la génération NPC." as const };
  }
  return { user };
}

export async function generateNpcPostAction() {
  const auth = await requireUser();
  if ("error" in auth) return { error: auth.error };

  const cooldown = await checkNpcCooldown(auth.user.id, "post");
  if (!cooldown.ok) return { error: cooldown.error };

  try {
    const tick = await runNarrativeTick();
    if (tick.handled) {
      if (tick.mode === "scripted_beat") {
        const inner = (tick.detail as { result?: { post_id?: number; author?: string } })
          ?.result;
        if (inner?.post_id) {
          await setNpcCooldown(auth.user.id, "post");
          revalidatePath("/");
          revalidatePath("/trending");
          revalidateDataCaches();
          return {
            success: true,
            author: inner.author ?? "NPC",
            postId: inner.post_id,
          };
        }
      } else if (tick.mode === "emergent" || tick.mode === "ambient") {
        const extracted = tickPostFromDetail(
          tick.detail as Record<string, unknown> | undefined
        );
        if (extracted?.postId) {
          await setNpcCooldown(auth.user.id, "post");
          revalidatePath("/");
          revalidatePath("/trending");
          revalidateDataCaches();
          return {
            success: true,
            author: extracted.author ?? "NPC",
            postId: extracted.postId,
          };
        }
      }
    }

    const result = await generateNpcPost();
    if (!result.ok) {
      return { error: result.error };
    }

    await setNpcCooldown(auth.user.id, "post");

    revalidatePath("/");
    revalidatePath("/trending");
    revalidateDataCaches();
    return {
      success: true,
      author: result.author,
      postId: result.postId,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur lors de la génération.";
    return { error: message };
  }
}

export async function generateNpcCommentAction() {
  const auth = await requireUser();
  if ("error" in auth) return { error: auth.error };

  const cooldown = await checkNpcCooldown(auth.user.id, "comment");
  if (!cooldown.ok) return { error: cooldown.error };

  try {
    const tick = await runNarrativeTick();
    if (tick.handled) {
      if (tick.mode === "scripted_beat") {
        const inner = (tick.detail as {
          result?: { comment_id?: number; post_id?: number; author?: string };
        })?.result;
        if (inner?.comment_id && inner?.post_id) {
          await setNpcCooldown(auth.user.id, "comment");
          revalidatePath("/");
          revalidatePath(`/post/${inner.post_id}`);
          revalidatePath("/trending");
          revalidateDataCaches();
          return {
            success: true,
            author: inner.author ?? "NPC",
            postId: inner.post_id,
            commentId: inner.comment_id,
          };
        }
      }

      const extracted = tickPostFromDetail(
        tick.detail as Record<string, unknown> | undefined
      );
      const commentId = extracted?.commentId;
      const postId = extracted?.postId;
      const author = extracted?.author ?? "NPC";

      if (commentId && postId) {
        await setNpcCooldown(auth.user.id, "comment");
        revalidatePath("/");
        revalidatePath(`/post/${postId}`);
        revalidatePath("/trending");
        revalidateDataCaches();
        return {
          success: true,
          author,
          postId,
          commentId,
        };
      }
    }

    const result = await generateNpcComment();
    if (!result.ok) {
      return { error: result.error };
    }

    await setNpcCooldown(auth.user.id, "comment");

    revalidatePath("/");
    revalidatePath(`/post/${result.postId}`);
    revalidatePath("/trending");
    revalidateDataCaches();
    return {
      success: true,
      author: result.author,
      postId: result.postId,
      commentId: result.commentId,
    };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erreur lors de la génération.";
    return { error: message };
  }
}
