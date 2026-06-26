export const HUNT_KEYWORDS = [
  "humain",
  "intrus",
  "non-npc",
  "non npc",
  "profil suspect",
  "compte humain",
] as const;

export function contentHasHuntKeywords(content: string): boolean {
  const lower = content.toLowerCase();
  return HUNT_KEYWORDS.some((k) => lower.includes(k));
}

export function suspicionScoreForContent(content: string): number {
  let score = 0;
  const lower = content.toLowerCase();
  for (const k of HUNT_KEYWORDS) {
    if (lower.includes(k)) score += 2;
  }
  if (/@\w+/.test(content)) score += 1;
  return score;
}
