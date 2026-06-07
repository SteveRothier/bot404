"use server";

import { resolveEmbedMediaUrl as resolve } from "@/lib/embed-media";
import type { ResolvedEmbedMedia } from "@/lib/embed-media";

export async function resolveEmbedMedia(
  sourceUrl: string
): Promise<ResolvedEmbedMedia | null> {
  return resolve(sourceUrl);
}
