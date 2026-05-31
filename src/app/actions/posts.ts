"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPost(formData: FormData) {
  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length > 500) {
    return { error: "Post invalide (max 500 caractères)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connectez-vous pour poster." };
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    content,
  });

  if (error) {
    return { error: error.message };
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
