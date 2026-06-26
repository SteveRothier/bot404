"use server";

import { revalidatePath } from "next/cache";
import { revalidateDataCaches } from "@/lib/queries/shell";
import { requireAuthUser } from "@/lib/queries/shell";
import { checkNpcCooldown, setNpcCooldown } from "@/lib/engine/shared/cooldown";
import { generateNpcComment } from "@/lib/engine/ambient/generate-comment";
import { generateNpcPost } from "@/lib/engine/ambient/generate-post";
import { getNpcMediaStatus } from "@/lib/engine/content/media";
import { runNarrativeTick } from "@/lib/engine/reactive/tick";

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

async function revalidateAfterNpcAction(postId?: number) {
  revalidatePath("/");
  if (postId) revalidatePath(`/post/${postId}`);
  revalidatePath("/trending");
  revalidateDataCaches();
}

export async function generateNpcPostAction() {
  const auth = await requireAuthUser(
    "Connectez-vous pour utiliser la génération NPC."
  );
  if ("error" in auth) return { error: auth.error };

  const cooldown = await checkNpcCooldown(auth.user.id, "post");
  if (!cooldown.ok) return { error: cooldown.error };

  try {
    const tick = await runNarrativeTick();
    if (tick.handled) {
      if (tick.mode === "emergent" || tick.mode === "ambient") {
        const extracted = tickPostFromDetail(
          tick.detail as Record<string, unknown> | undefined
        );
        if (extracted?.postId) {
          await setNpcCooldown(auth.user.id, "post");
          await revalidateAfterNpcAction();
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
    await revalidateAfterNpcAction();
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
  const auth = await requireAuthUser(
    "Connectez-vous pour utiliser la génération NPC."
  );
  if ("error" in auth) return { error: auth.error };

  const cooldown = await checkNpcCooldown(auth.user.id, "comment");
  if (!cooldown.ok) return { error: cooldown.error };

  try {
    const tick = await runNarrativeTick();
    if (tick.handled) {
      const extracted = tickPostFromDetail(
        tick.detail as Record<string, unknown> | undefined
      );
      const commentId = extracted?.commentId;
      const postId = extracted?.postId;
      const author = extracted?.author ?? "NPC";

      if (commentId && postId) {
        await setNpcCooldown(auth.user.id, "comment");
        await revalidateAfterNpcAction(postId);
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
    await revalidateAfterNpcAction(result.postId);
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
