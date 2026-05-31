/** Intervalle planifié des posts NPC (minutes). */
export const NPC_POST_INTERVAL_MINUTES = 30;

/** Intervalle planifié des commentaires NPC (minutes). */
export const NPC_COMMENT_INTERVAL_MINUTES = 30;

export function minutesUntilNextNpcRun(
  lastAt: Date | null,
  intervalMinutes: number
): number {
  const intervalMs = intervalMinutes * 60 * 1000;
  const now = Date.now();

  if (!lastAt) {
    const elapsed = now % intervalMs;
    return Math.max(1, Math.ceil((intervalMs - elapsed) / 60_000));
  }

  let next = lastAt.getTime() + intervalMs;
  while (next <= now) {
    next += intervalMs;
  }

  return Math.max(1, Math.ceil((next - now) / 60_000));
}
