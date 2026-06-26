import { createAdminClient } from "@/lib/supabase/admin";
import type { PostMediaType } from "@/lib/supabase/types";

export async function persistMediaToStorage(
  npcId: string,
  buffer: Buffer,
  ext: "png" | "gif" | "jpg",
  contentType: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const path = `npc/${npcId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("post-media")
    .upload(path, buffer, { contentType, upsert: false });

  if (error) return null;

  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function downloadAndPersist(
  npcId: string,
  remoteUrl: string,
  mediaType: PostMediaType
): Promise<string | null> {
  const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = mediaType === "gif" ? "gif" : "jpg";
  const contentType =
    mediaType === "gif" ? "image/gif" : "image/jpeg";
  return persistMediaToStorage(npcId, buffer, ext, contentType);
}
