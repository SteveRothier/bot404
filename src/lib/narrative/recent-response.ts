/** Fenêtre pour surbrillance des réponses narrative au fil (2 min). */
export const RECENT_NARRATIVE_RESPONSE_MS = 2 * 60 * 1000;

export function isRecentNarrativeResponse(createdAt: string, nowMs = Date.now()): boolean {
  const t = new Date(createdAt).getTime();
  return nowMs - t <= RECENT_NARRATIVE_RESPONSE_MS;
}
