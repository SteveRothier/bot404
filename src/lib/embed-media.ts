export type EmbedMediaKind = "gif" | "mp4";

const URL_EXTRACT_REGEX = /https:\/\/[^\s<>"']+/gi;

const EMBED_HOST_SUFFIXES = [
  "discordapp.net",
  "discordapp.com",
  "discord.com",
  "tenor.com",
  "giphy.com",
];

function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,!?;:)\]}>]+$/, "");
}

function pathnameLower(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function hostnameLower(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isKnownEmbedHost(host: string): boolean {
  return EMBED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

export function isTenorViewUrl(url: string): boolean {
  return /tenor\.com\/view\//i.test(url);
}

export function extractTenorPostId(url: string): string | null {
  const match = url.match(/tenor\.com\/view\/[^?\s#]+-(\d+)/i);
  return match?.[1] ?? null;
}

export function getEmbedMediaKind(url: string): EmbedMediaKind | null {
  const path = pathnameLower(url);
  if (path.endsWith(".gif")) return "gif";
  if (path.endsWith(".mp4") || path.endsWith(".webm")) return "mp4";

  const host = hostnameLower(url);
  if (!isKnownEmbedHost(host)) return null;

  if (path.includes(".gif")) return "gif";
  if (path.includes(".mp4") || path.includes(".webm")) return "mp4";

  return null;
}

export function isEmbeddableSourceUrl(url: string): boolean {
  return getEmbedMediaKind(url) !== null || isTenorViewUrl(url);
}

export function extractEmbedMediaUrls(content: string): string[] {
  const matches = content.match(URL_EXTRACT_REGEX) ?? [];
  const seen = new Set<string>();

  for (const raw of matches) {
    const url = trimTrailingPunctuation(raw);
    if (seen.has(url)) continue;
    seen.add(url);
    if (isEmbeddableSourceUrl(url)) return [url];
  }

  return [];
}

export function stripEmbedUrlsForDisplay(content: string): string {
  const embed = extractEmbedMediaUrls(content)[0];
  if (!embed) return content;
  return content.replace(embed, "").replace(/\s+/g, " ").trim();
}

export function shouldHideEmbedUrl(
  url: string,
  embedSourceUrl: string | undefined
): boolean {
  if (!embedSourceUrl) return false;
  const trimmed = trimTrailingPunctuation(url);
  return trimmed === embedSourceUrl;
}

function mediaFilenameKey(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase();
    const match = path.match(/\/([^/]+\.(?:gif|mp4|webm))$/i);
    return match?.[1] ?? path;
  } catch {
    return url.toLowerCase();
  }
}

export function embedUrlDuplicatesMedia(
  embedUrl: string,
  mediaUrl: string | null | undefined
): boolean {
  if (!mediaUrl) return false;
  if (embedUrl === mediaUrl) return true;
  if (embedUrl.includes(mediaUrl) || mediaUrl.includes(embedUrl)) return true;
  return mediaFilenameKey(embedUrl) === mediaFilenameKey(mediaUrl);
}

export type ResolvedEmbedMedia = {
  url: string;
  kind: EmbedMediaKind;
};

function parseOgMetaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function parseTenorOgMedia(html: string): ResolvedEmbedMedia | null {
  const videoSecure = parseOgMetaContent(html, "og:video:secure_url");
  const video = parseOgMetaContent(html, "og:video");
  const image = parseOgMetaContent(html, "og:image");

  for (const url of [videoSecure, video]) {
    if (!url) continue;
    const kind = getEmbedMediaKind(url) ?? "mp4";
    return { url, kind };
  }

  if (image) {
    return { url: image, kind: getEmbedMediaKind(image) ?? "gif" };
  }

  return null;
}

export async function fetchTenorViewOgMedia(
  viewUrl: string
): Promise<ResolvedEmbedMedia | null> {
  try {
    const res = await fetch(viewUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    return parseTenorOgMedia(await res.text());
  } catch {
    return null;
  }
}

async function resolveTenorViaApi(id: string): Promise<ResolvedEmbedMedia | null> {
  const key = process.env.TENOR_API_KEY?.trim();
  if (!key) return null;

  const apiUrl = new URL("https://tenor.googleapis.com/v2/posts");
  apiUrl.searchParams.set("ids", id);
  apiUrl.searchParams.set("key", key);
  apiUrl.searchParams.set("media_filter", "gif,mp4,tinygif,mediumgif");

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{
        media_formats?: {
          gif?: { url?: string };
          mp4?: { url?: string };
          mediumgif?: { url?: string };
          tinygif?: { url?: string };
        };
      }>;
    };
    const media = data.results?.[0]?.media_formats;
    const url =
      media?.gif?.url ??
      media?.mp4?.url ??
      media?.mediumgif?.url ??
      media?.tinygif?.url ??
      null;
    if (!url) return null;
    return { url, kind: getEmbedMediaKind(url) ?? "gif" };
  } catch {
    return null;
  }
}

async function resolveTenorViaOembed(
  viewUrl: string
): Promise<ResolvedEmbedMedia | null> {
  try {
    const oembedUrl = new URL("https://tenor.com/oembed");
    oembedUrl.searchParams.set("url", viewUrl);
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    if (!data.thumbnail_url) return null;
    return {
      url: data.thumbnail_url,
      kind: getEmbedMediaKind(data.thumbnail_url) ?? "gif",
    };
  } catch {
    return null;
  }
}

export async function resolveTenorViewUrl(
  viewUrl: string
): Promise<ResolvedEmbedMedia | null> {
  const id = extractTenorPostId(viewUrl);
  if (!id) return null;

  return (
    (await resolveTenorViaApi(id)) ??
    (await fetchTenorViewOgMedia(viewUrl)) ??
    (await resolveTenorViaOembed(viewUrl))
  );
}

export async function resolveEmbedMediaUrl(
  sourceUrl: string
): Promise<ResolvedEmbedMedia | null> {
  const directKind = getEmbedMediaKind(sourceUrl);
  if (directKind) {
    return { url: sourceUrl, kind: directKind };
  }

  if (isTenorViewUrl(sourceUrl)) {
    return resolveTenorViewUrl(sourceUrl);
  }

  return null;
}
