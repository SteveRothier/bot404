"use server";

import { revalidatePath } from "next/cache";
import { processPostFactionEffects } from "@/lib/factions/simulation";
import { createMentionNotifications } from "@/lib/notifications";
import { isValidPostType } from "@/lib/post-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { PostMediaType, PostType } from "@/lib/supabase/types";

const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function mediaTypeFromMime(mime: string): PostMediaType | null {
  if (ALLOWED_MEDIA_TYPES.has(mime)) return "image";
  return null;
}

function extensionFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function createPost(formData: FormData) {
  const content = (formData.get("content") as string)?.trim() ?? "";
  const rawType = (formData.get("post_type") as string) ?? "message";
  const post_type: PostType = isValidPostType(rawType) ? rawType : "message";
  const mediaFile = formData.get("media");

  if (!content && !(mediaFile instanceof File && mediaFile.size > 0)) {
    return { error: "Ajoutez du texte ou une image." };
  }

  if (content.length > 500) {
    return { error: "Post invalide (max 500 caractères)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour poster." };
  }

  let media_url: string | null = null;
  let media_type: PostMediaType | null = null;

  if (mediaFile instanceof File && mediaFile.size > 0) {
    if (mediaFile.size > MAX_MEDIA_BYTES) {
      return { error: "Image trop volumineuse (max 2 Mo)." };
    }

    const resolvedType = mediaTypeFromMime(mediaFile.type);
    if (!resolvedType) {
      return { error: "Format non supporté (JPEG, PNG ou WebP)." };
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

  if (post?.id) {
    await processPostFactionEffects(createAdminClient(), post.id);
    if (content) {
      await createMentionNotifications(content, user.id, post.id);
    }
  }

  revalidatePath("/");
  return { success: true };
}

export async function toggleLike(postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour liker." };
  }

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("post_likes").insert({
      user_id: user.id,
      post_id: postId,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/");
  return { success: true, liked: !existing };
}

export async function createComment(postId: number, formData: FormData) {
  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length > 300) {
    return { error: "Commentaire invalide (max 300 caractères)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour commenter." };
  }

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    content,
  });

  if (error) {
    return { error: error.message };
  }

  await createMentionNotifications(content, user.id, postId);

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function deletePost(postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour supprimer un post." };
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/saved");
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function deleteComment(commentId: number, postId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour supprimer un commentaire." };
  }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  return { success: true };
}
