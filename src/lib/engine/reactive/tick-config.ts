export function getSignalsPerTick(): number {
  const raw = process.env.NARRATIVE_SIGNALS_PER_TICK ?? "4";
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 4;
  return Math.min(n, 8);
}

export function getAmbientFallbackChance(): number {
  const raw = process.env.NPC_AMBIENT_FALLBACK_CHANCE ?? "0.85";
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0.85;
  return Math.min(Math.max(n, 0), 1);
}

/** Commentaires ambient générés par tick (sans signaux émergents). */
export function getAmbientCommentsPerTick(): number {
  return parseEnvInt("NPC_AMBIENT_COMMENTS_PER_TICK", 4, 8);
}

/** Probabilité de privilégier des commentaires vs un post en ambient. */
export function getAmbientCommentPreferChance(): number {
  return parseEnvFloat("NPC_AMBIENT_COMMENT_CHANCE", 0.92);
}

/** Votes NPC supplémentaires sur sondages actifs par tick. */
export function getPollVotesPerTick(): number {
  return parseEnvInt("NPC_POLL_VOTES_PER_TICK", 3, 6);
}

function parseEnvFloat(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 0), 1);
}

function parseEnvInt(key: string, fallback: number, max: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

/** Probabilité qu'un commentaire ambient réponde à un commentaire existant (@username). */
export function getCommentReplyChance(): number {
  return parseEnvFloat("NPC_COMMENT_REPLY_CHANCE", 0.55);
}

/** Probabilité de j'aime NPC sur les commentaires d'un fil après génération. */
export function getCommentLikeChance(): number {
  return parseEnvFloat("NPC_COMMENT_LIKE_CHANCE", 0.75);
}

/** Probabilité de j'aime NPC sur le post après génération de commentaire. */
export function getPostReactionAfterCommentChance(): number {
  return parseEnvFloat("NPC_POST_REACTION_AFTER_COMMENT_CHANCE", 0.65);
}

export function getNpcPostReactionBounds(): { min: number; max: number } {
  const min = parseEnvInt("NPC_POST_REACTION_MIN", 1, 10);
  const max = parseEnvInt("NPC_POST_REACTION_MAX", 4, 15);
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

export function rollChance(chance: number, random = Math.random): boolean {
  return random() < chance;
}
