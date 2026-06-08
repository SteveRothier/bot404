import { isExternalAvatarUrl, normalizeAvatarUrlForSave } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/server";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function supabaseStoragePrefix(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/post-media/`;
}

function isPersistedAvatarUrl(url: string, userId: string): boolean {
  const prefix = supabaseStoragePrefix();
  if (!prefix || !url.startsWith(prefix)) return false;
  return url.includes(`/${userId}/avatar.`);
}

function extensionFromMime(mime: string): string {
  if (mime === "image/gif") return "gif";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function persistAvatarUrlIfRemote(
  userId: string,
  avatarUrl: string | null
): Promise<{ url: string | null } | { error: string }> {
  const normalized = normalizeAvatarUrlForSave(avatarUrl, userId);
  if (!normalized) return { url: null };
  if (isPersistedAvatarUrl(normalized, userId)) return { url: normalized };
  if (!isExternalAvatarUrl(normalized)) return { url: normalized };

  let buffer: Buffer;
  let contentType: string;

  try {
    const res = await fetch(normalized, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) {
      return {
        error:
          "Impossible de télécharger l'image. Vérifiez l'URL ou utilisez un lien Discord récent.",
      };
    }
    contentType = (res.headers.get("content-type") ?? "image/jpeg")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) {
      return { error: "Format d'image non supporté (JPEG, PNG, WebP, GIF)." };
    }
    buffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return {
      error:
        "Impossible de télécharger l'image. Vérifiez l'URL ou utilisez un lien Discord récent.",
    };
  }

  if (buffer.byteLength > MAX_AVATAR_BYTES) {
    return { error: "Image trop volumineuse (max 2 Mo)." };
  }

  const supabase = await createClient();
  const ext = extensionFromMime(contentType);
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("post-media")
    .upload(path, buffer, { contentType, upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return { url: data.publicUrl };
}
