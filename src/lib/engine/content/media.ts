import {
  prefersAiImageMedia,
  prefersGifMedia,
  prefersSteamMedia,
} from "@/lib/engine/casting/cast";
import { downloadAndPersist, persistMediaToStorage } from "@/lib/engine/content/media-storage";
import { fetchGifUrlForQuery } from "@/lib/engine/content/gif-search";
import { npcBase } from "@/lib/engine/content/prompt";
import {
  isSteamMediaEnabled,
  resolveSteamPostMedia,
} from "@/lib/engine/content/steam-media";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostMediaType, PostType, Profile } from "@/lib/supabase/types";

export type NpcMediaResult = {
  media_url: string;
  media_type: PostMediaType;
};

const MEDIA_FORBIDDEN = /\b(nude|naked|nsfw|gore|explicit)\b/i;

function hasGifSearch(): boolean {
  return !!(process.env.TENOR_API_KEY || process.env.GIPHY_API_KEY);
}

function hasAiImage(): boolean {
  return !!(process.env.IMAGE_API_URL && process.env.IMAGE_API_KEY);
}

export function isNpcMediaEnabled(): boolean {
  return hasGifSearch() || hasAiImage() || isSteamMediaEnabled();
}

function maxMediaPerDay(): number {
  const n = Number.parseInt(process.env.NPC_MEDIA_MAX_PER_DAY ?? "20", 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export async function countNpcMediaToday(): Promise<number> {
  const supabase = createAdminClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);

  const { data: npcs } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_npc", true);
  const npcIds = npcs?.map((n) => n.id) ?? [];
  if (npcIds.length === 0) return 0;

  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .in("author_id", npcIds)
    .not("media_url", "is", null)
    .gte("created_at", since.toISOString());

  return count ?? 0;
}

const MEDIA_CHANCE: Record<PostType, number> = {
  message: 0.22,
  theory: 0.1,
  signal: 0,
  rumor: 0.18,
};

/** Bonus si Tenor/Giphy configuré (tous les NPC peuvent poster un GIF). */
const GIF_API_CHANCE_BONUS = 0.12;
const MEME_GIF_CHANCE_BONUS = 0.22;

export function shouldAttachMediaToNpcPost(
  npc: Profile,
  postType: PostType,
  random = Math.random
): boolean {
  if (!isNpcMediaEnabled()) return false;
  if (postType === "signal") return false;
  let chance = MEDIA_CHANCE[postType] ?? 0.12;
  if (hasGifSearch()) chance += GIF_API_CHANCE_BONUS;
  if (prefersGifMedia(npc)) chance += MEME_GIF_CHANCE_BONUS;
  if (prefersAiImageMedia(npc)) chance += 0.08;
  if (prefersSteamMedia(npc) && isSteamMediaEnabled()) chance += 0.1;
  return random() < Math.min(chance, 0.85);
}

export function getNpcMediaStatus(): {
  enabled: boolean;
  gif: boolean;
  steam: boolean;
  ai: boolean;
} {
  return {
    enabled: isNpcMediaEnabled(),
    gif: hasGifSearch(),
    steam: isSteamMediaEnabled(),
    ai: hasAiImage(),
  };
}

function buildImagePrompt(npc: Profile, postContent: string): string {
  return `${npcBase(npc)}. Illustration dystopique pour ce post sur Bot404 : « ${postContent.slice(0, 200)} ». Style réseau social, pas de texte dans l'image.`;
}

async function generateAiImage(prompt: string): Promise<Buffer | null> {
  const baseUrl = (process.env.IMAGE_API_URL ?? "").replace(/\/$/, "");
  const key = process.env.IMAGE_API_KEY;
  const model = process.env.IMAGE_API_MODEL ?? "flux-schnell";
  if (!baseUrl || !key) return null;
  if (MEDIA_FORBIDDEN.test(prompt)) return null;

  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      prompt: prompt.slice(0, 900),
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const item = data.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(30_000) });
    if (!imgRes.ok) return null;
    return Buffer.from(await imgRes.arrayBuffer());
  }
  return null;
}

export async function resolveGifMedia(
  npc: Profile,
  postContent: string
): Promise<NpcMediaResult | null> {
  if (!hasGifSearch()) return null;

  const remote = await fetchGifUrlForQuery(postContent);
  if (!remote) return null;
  const url = await downloadAndPersist(npc.id, remote, "gif");
  return url ? { media_url: url, media_type: "gif" } : null;
}

export async function resolveNpcPostMedia(
  npc: Profile,
  postContent: string,
  postType: PostType
): Promise<NpcMediaResult | null> {
  if (!shouldAttachMediaToNpcPost(npc, postType)) return null;

  const used = await countNpcMediaToday();
  if (used >= maxMediaPerDay()) return null;

  // NPC mème / shitpost : GIF en priorité
  if (prefersGifMedia(npc) && hasGifSearch()) {
    const gif = await resolveGifMedia(npc, postContent);
    if (gif) return gif;
  }

  if (prefersSteamMedia(npc) && isSteamMediaEnabled()) {
    const steam = await resolveSteamPostMedia(npc, postContent);
    if (steam) return steam;
  }

  if (hasGifSearch()) {
    const gif = await resolveGifMedia(npc, postContent);
    if (gif) return gif;
  }

  if (hasAiImage()) {
    const buffer = await generateAiImage(buildImagePrompt(npc, postContent));
    if (!buffer) return null;
    const url = await persistMediaToStorage(
      npc.id,
      buffer,
      "png",
      "image/png"
    );
    return url ? { media_url: url, media_type: "image" } : null;
  }

  return null;
}
