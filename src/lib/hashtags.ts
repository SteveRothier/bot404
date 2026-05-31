export const HASHTAG_REGEX = /(#[\w\u00C0-\u024F]+)/gi;
export const HASHTAG_MATCH_REGEX = /#[\w\u00C0-\u024F]+/gi;
export const HASHTAG_TOKEN_REGEX = /^#[\w\u00C0-\u024F]+$/i;

export function normalizeHashtag(tag: string): string {
  const trimmed = tag.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.toLowerCase();
}

export function hashtagSearchHref(tag: string): string {
  const normalized = normalizeHashtag(tag);
  return `/search?q=${encodeURIComponent(normalized)}`;
}

export function extractHashtags(text: string): string[] {
  return text.match(HASHTAG_MATCH_REGEX) ?? [];
}

export function countHashtagsFromTexts(
  texts: string[]
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const seenInText = new Set<string>();
    for (const tag of extractHashtags(text)) {
      const normalized = normalizeHashtag(tag);
      if (seenInText.has(normalized)) continue;
      seenInText.add(normalized);
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return counts;
}

export function topHashtags(
  counts: Map<string, number>,
  limit = 5
): { tag: string; count: number }[] {
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}
