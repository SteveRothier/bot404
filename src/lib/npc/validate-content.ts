import type { PostType } from "@/lib/supabase/types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Similarité grossière : refus si quasi-copie du texte source. */
export function isTooSimilarToSource(
  generated: string,
  source: string,
  threshold = 0.85
): boolean {
  if (!source.trim()) return false;
  const a = normalize(generated);
  const b = normalize(source);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (shorter.length / longer.length > threshold) return true;
  return false;
}

export function isTooSimilarToAny(
  generated: string,
  sources: string[],
  threshold = 0.85
): boolean {
  return sources.some((s) => isTooSimilarToSource(generated, s, threshold));
}

export function validateNpcPostContent(
  content: string,
  postType: PostType,
  sourceText = "",
  recentTexts: string[] = []
): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  if (postType === "rumor") {
    const lower = trimmed.toLowerCase();
    if (
      !lower.startsWith("on dit") &&
      !lower.includes("on dit que") &&
      !lower.startsWith("rumeur")
    ) {
      return `On dit que ${trimmed}`.slice(0, 500);
    }
  }

  if (sourceText && isTooSimilarToSource(trimmed, sourceText)) {
    return null;
  }

  if (isTooSimilarToAny(trimmed, recentTexts)) {
    return null;
  }

  return trimmed;
}
