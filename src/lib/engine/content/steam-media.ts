import { downloadAndPersist } from "@/lib/engine/content/media-storage";
import type { PostMediaType, Profile } from "@/lib/supabase/types";

export type SteamMediaResult = {
  media_url: string;
  media_type: PostMediaType;
};

export function isSteamMediaEnabled(): boolean {
  return !!process.env.STEAM_WEB_API_KEY?.trim();
}

export type SteamStoreSearchItem = {
  id: number;
  name?: string;
  type?: string;
};

export function parseSteamStoreSearch(
  payload: unknown
): SteamStoreSearchItem | null {
  if (!payload || typeof payload !== "object") return null;
  const items = (payload as { items?: unknown[] }).items;
  if (!Array.isArray(items) || items.length === 0) return null;

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { id?: number; type?: string; name?: string };
    const id = item.id;
    if (typeof id !== "number" || id <= 0) continue;
    const type = item.type?.toLowerCase() ?? "";
    if (type && type !== "app" && type !== "game") continue;
    return { id, name: item.name, type: item.type };
  }

  const first = items[0] as { id?: number; name?: string; type?: string };
  if (typeof first?.id === "number" && first.id > 0) {
    return { id: first.id, name: first.name, type: first.type };
  }
  return null;
}

export function steamHeaderUrls(appId: number): string[] {
  return [
    `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
    `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
  ];
}

export async function searchSteamAppId(query: string): Promise<number | null> {
  const term = query.trim().slice(0, 80);
  if (!term) return null;

  const url = new URL("https://store.steampowered.com/api/storesearch/");
  url.searchParams.set("term", term);
  url.searchParams.set("l", "french");
  url.searchParams.set("cc", "FR");

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;

  const data = (await res.json()) as unknown;
  const parsed = parseSteamStoreSearch(data);
  return parsed?.id ?? null;
}

async function fetchFirstValidHeader(appId: number): Promise<string | null> {
  for (const headerUrl of steamHeaderUrls(appId)) {
    const head = await fetch(headerUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(10_000),
    });
    if (head.ok) return headerUrl;
  }
  return steamHeaderUrls(appId)[0] ?? null;
}

export function extractGameSearchQuery(postContent: string): string {
  const words = postContent
    .toLowerCase()
    .replace(/[#@]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);
  const joined = words.join(" ").trim();
  return joined || "indie game";
}

export async function resolveSteamPostMedia(
  npc: Profile,
  postContent: string
): Promise<SteamMediaResult | null> {
  if (!isSteamMediaEnabled()) return null;

  const query = extractGameSearchQuery(postContent);
  const appId = await searchSteamAppId(query);
  if (!appId) return null;

  const headerUrl = await fetchFirstValidHeader(appId);
  if (!headerUrl) return null;

  const persisted = await downloadAndPersist(npc.id, headerUrl, "image");
  if (!persisted) return null;

  return { media_url: persisted, media_type: "image" };
}

export async function verifySteamWebApiKey(): Promise<boolean> {
  const key = process.env.STEAM_WEB_API_KEY?.trim();
  if (!key) return false;

  const url = new URL(
    "https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/"
  );
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return res.ok;
  } catch {
    return false;
  }
}
