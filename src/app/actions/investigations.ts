"use server";

import { revalidatePath } from "next/cache";
import { createInvestigationEntryNotification } from "@/lib/notifications";
import { getOpenInvestigations } from "@/lib/queries/investigations";
import { createClient } from "@/lib/supabase/server";
import type { InvestigationVoteKind } from "@/lib/supabase/types";

export async function getOpenInvestigationsForPicker() {
  const list = await getOpenInvestigations(20);
  return list.map((i) => ({ id: i.id, title: i.title }));
}

export async function createInvestigation(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const sectorCode = (formData.get("sector_code") as string)?.trim() || null;

  if (!title || title.length > 120) {
    return { error: "Titre invalide (max 120 caractères)." };
  }
  if (!description || description.length > 2000) {
    return { error: "Description invalide (max 2000 caractères)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connectez-vous pour ouvrir un dossier." };

  const { data, error } = await supabase
    .from("investigations")
    .insert({
      title,
      description,
      author_id: user.id,
      sector_code: sectorCode,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dossiers");
  return { success: true, id: data.id };
}

export async function addInvestigationEntry(
  investigationId: number,
  formData: FormData
) {
  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length > 1000) {
    return { error: "Preuve invalide (max 1000 caractères)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connectez-vous." };

  const { error } = await supabase.from("investigation_entries").insert({
    investigation_id: investigationId,
    author_id: user.id,
    content,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dossier/${investigationId}`);
  return { success: true };
}

export async function linkPostToInvestigation(
  postId: number,
  investigationId: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connectez-vous." };

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, content, post_type")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post) return { error: "Post introuvable." };
  if (post.post_type !== "theory") {
    return { error: "Seules les théories peuvent être liées à un dossier." };
  }

  const { data: investigation, error: invError } = await supabase
    .from("investigations")
    .select("id, author_id, status")
    .eq("id", investigationId)
    .maybeSingle();

  if (invError || !investigation) return { error: "Dossier introuvable." };
  if (investigation.status !== "open") {
    return { error: "Ce dossier n'accepte plus de preuves." };
  }

  const { data: existing } = await supabase
    .from("investigation_entries")
    .select("id")
    .eq("investigation_id", investigationId)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) return { error: "Ce post est déjà dans ce dossier." };

  const excerpt =
    post.content.length > 280
      ? `${post.content.slice(0, 277)}…`
      : post.content;

  const { error } = await supabase.from("investigation_entries").insert({
    investigation_id: investigationId,
    author_id: user.id,
    content: `[Post #${postId}] ${excerpt}`,
    post_id: postId,
  });

  if (error) return { error: error.message };

  if (investigation.author_id !== user.id) {
    await createInvestigationEntryNotification(
      investigation.author_id,
      user.id,
      postId
    );
  }

  revalidatePath(`/dossier/${investigationId}`);
  revalidatePath("/dossiers");
  return { success: true };
}

export async function voteInvestigation(
  investigationId: number,
  vote: InvestigationVoteKind
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connectez-vous pour voter." };

  const { error } = await supabase.from("investigation_votes").upsert(
    {
      investigation_id: investigationId,
      user_id: user.id,
      vote,
    },
    { onConflict: "investigation_id,user_id" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/dossier/${investigationId}`);
  return { success: true };
}
