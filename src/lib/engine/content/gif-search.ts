/** Recherche GIF Tenor / Giphy (serveur uniquement). */

export type GiphyGifResult = {
  id: string;
  previewUrl: string;
  url: string;
};

type GiphyImageSet = {
  original?: { url?: string };
  downsized_medium?: { url?: string };
  fixed_height?: { url?: string };
  fixed_height_small?: { url?: string };
  downsized_small?: { url?: string };
};

type GiphyItem = {
  id?: string;
  images?: GiphyImageSet;
};

function pickGiphyUrl(item: GiphyItem): string | null {
  const img = item.images;
  return (
    img?.downsized_medium?.url ??
    img?.original?.url ??
    img?.fixed_height?.url ??
    null
  );
}

function pickGiphyPreviewUrl(item: GiphyItem): string | null {
  const img = item.images;
  return (
    img?.fixed_height_small?.url ??
    img?.downsized_small?.url ??
    img?.downsized_medium?.url ??
    null
  );
}

export function parseGiphyGifItem(row: unknown): GiphyGifResult | null {
  if (!row || typeof row !== "object") return null;
  const item = row as GiphyItem;
  const url = pickGiphyUrl(item);
  if (!url || !item.id) return null;
  const previewUrl = pickGiphyPreviewUrl(item) ?? url;
  return { id: item.id, previewUrl, url };
}

export function parseGiphyGifsResponse(payload: unknown): GiphyGifResult[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown[] }).data;
  if (!Array.isArray(data)) return [];

  const results: GiphyGifResult[] = [];
  for (const row of data) {
    const parsed = parseGiphyGifItem(row);
    if (parsed) results.push(parsed);
  }
  return results;
}

export function parseGiphySearchResponse(payload: unknown): string | null {
  const results = parseGiphyGifsResponse(payload);
  return results[0]?.url ?? null;
}

function giphyApiKey(): string | null {
  return process.env.GIPHY_API_KEY?.trim() || null;
}

async function fetchGiphyEndpoint(
  path: "search" | "trending",
  params: Record<string, string>
): Promise<GiphyGifResult[]> {
  const key = giphyApiKey();
  if (!key) return [];

  const url = new URL(`https://api.giphy.com/v1/gifs/${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("rating", "pg-13");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    return parseGiphyGifsResponse(await res.json());
  } catch {
    return [];
  }
}

export async function searchGiphyGifs(
  query: string,
  limit = 16
): Promise<GiphyGifResult[]> {
  const q = query.trim().slice(0, 80);
  if (!q) return fetchGiphyTrending(limit);

  const capped = String(Math.min(Math.max(limit, 1), 50));
  const results = await fetchGiphyEndpoint("search", {
    q,
    limit: capped,
    lang: "fr",
  });
  if (results.length > 0) return results;

  const key = giphyApiKey();
  if (!key) return [];

  const translateUrl = new URL("https://api.giphy.com/v1/gifs/translate");
  translateUrl.searchParams.set("api_key", key);
  translateUrl.searchParams.set("s", q.slice(0, 50));
  translateUrl.searchParams.set("limit", "1");

  try {
    const res = await fetch(translateUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    return parseGiphyGifsResponse(await res.json());
  } catch {
    return [];
  }
}

export async function fetchGiphyTrending(limit = 16): Promise<GiphyGifResult[]> {
  const capped = String(Math.min(Math.max(limit, 1), 50));
  return fetchGiphyEndpoint("trending", { limit: capped });
}

export async function searchGiphyGif(query: string): Promise<string | null> {
  const results = await searchGiphyGifs(query, 5);
  return results[0]?.url ?? null;
}

export async function searchTenorGif(query: string): Promise<string | null> {
  const key = process.env.TENOR_API_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://tenor.googleapis.com/v2/search");
  url.searchParams.set("q", query.trim().slice(0, 80) || "reaction");
  url.searchParams.set("key", key);
  url.searchParams.set("limit", "1");
  url.searchParams.set("media_filter", "gif");
  url.searchParams.set("locale", "fr_FR");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{
        media_formats?: {
          gif?: { url?: string };
          mediumgif?: { url?: string };
          tinygif?: { url?: string };
        };
      }>;
    };
    const media = data.results?.[0]?.media_formats;
    return (
      media?.gif?.url ?? media?.mediumgif?.url ?? media?.tinygif?.url ?? null
    );
  } catch {
    return null;
  }
}

export function extractGifSearchQuery(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[#@]/g, " ")
    .replace(/https?:\S+/g, " ");

  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 6);

  if (words.length > 0) return words.join(" ");

  return "cyberpunk dystopia reaction";
}

export async function fetchGifUrlForQuery(query: string): Promise<string | null> {
  const q = extractGifSearchQuery(query);
  return (await searchTenorGif(q)) ?? (await searchGiphyGif(q));
}

const GIPHY_HOSTS = new Set([
  "giphy.com",
  "media.giphy.com",
  "i.giphy.com",
]);

export function isAllowedGiphyUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return GIPHY_HOSTS.has(host) || host.endsWith(".giphy.com");
  } catch {
    return false;
  }
}
