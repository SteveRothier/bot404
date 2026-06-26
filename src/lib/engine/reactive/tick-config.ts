export function getSignalsPerTick(): number {
  const raw = process.env.NARRATIVE_SIGNALS_PER_TICK ?? "3";
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 3;
  return Math.min(n, 6);
}

export function getAmbientFallbackChance(): number {
  const raw = process.env.NPC_AMBIENT_FALLBACK_CHANCE ?? "0.55";
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0.55;
  return Math.min(Math.max(n, 0), 1);
}
