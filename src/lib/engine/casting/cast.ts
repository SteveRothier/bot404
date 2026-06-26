import type { NarrativeSignal } from "@/lib/engine/shared/types";
import type { Personality, Profile } from "@/lib/supabase/types";

const MEME_ARCHETYPES = [
  "PixelJunk",
  "TrollMaster",
  "Philosoraptor",
  "NeoByte",
  "CryptoSage",
  "FakeInfluencer",
  "DadJoke404",
  "GlitchGremlin",
];

const VISUAL_ARCHETYPES = [
  "GlitchQueen",
  "Synthwave",
  "PixelWitch",
  "PixelForge",
];

const STEAM_ARCHETYPES = ["Synthwave", "PatchNotes"];

const STEAM_TOPIC_KEYWORDS = ["gaming", "game", "meta", "patch", "nerf", "buff"];

const HUNT_ARCHETYPES = [
  "ConspiracyBot",
  "OracleVoid",
  "HAL_9000",
  "NoirDetective",
  "Omega",
  "Batman",
];

export type CastContext = {
  signal: NarrativeSignal;
  humanContent?: string;
  excludeNpcIds?: Set<string>;
  huntContent?: boolean;
};

function topicOverlapScore(npc: Profile, text: string): number {
  const p = (npc.personality ?? {}) as Personality;
  const topics = p.topics ?? [];
  const lower = text.toLowerCase();
  let score = 0;
  for (const topic of topics) {
    const t = topic.toLowerCase();
    if (t.length >= 3 && lower.includes(t)) score += 3;
  }
  return score;
}

export function scoreNpcForSignal(npc: Profile, ctx: CastContext): number {
  const { signal } = ctx;
  const text = (ctx.humanContent ?? "").slice(0, 500);

  let score = 1;

  if (signal.mentioned_username && npc.username === signal.mentioned_username) {
    return 1000;
  }

  if (signal.kind === "human_comment" && MEME_ARCHETYPES.includes(npc.username)) {
    score += 3;
  }

  if (ctx.huntContent && HUNT_ARCHETYPES.includes(npc.username)) {
    score += 6;
  }

  const suspicion =
    typeof signal.payload.suspicion_score === "number"
      ? signal.payload.suspicion_score
      : 0;
  if (suspicion >= 2 && HUNT_ARCHETYPES.includes(npc.username)) {
    score += suspicion * 2;
  }

  score += topicOverlapScore(npc, text);

  if (ctx.excludeNpcIds?.has(npc.id)) score -= 50;

  return score;
}

export function pickNpcForSignal(
  npcs: Profile[],
  ctx: CastContext,
  random = Math.random
): Profile | null {
  if (npcs.length === 0) return null;

  const scored = npcs
    .map((npc) => ({ npc, score: scoreNpcForSignal(npc, ctx) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const pool = npcs.filter((n) => !ctx.excludeNpcIds?.has(n.id));
    return pool[Math.floor(random() * pool.length)] ?? npcs[0];
  }

  const top = scored.slice(0, 4);
  const weights = top.map((s) => Math.max(s.score, 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < top.length; i++) {
    r -= weights[i];
    if (r <= 0) return top[i].npc;
  }
  return top[0].npc;
}

export function prefersGifMedia(npc: Profile): boolean {
  return MEME_ARCHETYPES.includes(npc.username);
}

export function prefersAiImageMedia(npc: Profile): boolean {
  return VISUAL_ARCHETYPES.includes(npc.username);
}

export function prefersSteamMedia(npc: Profile): boolean {
  if (STEAM_ARCHETYPES.includes(npc.username)) return true;
  const p = (npc.personality ?? {}) as Personality;
  const topics = (p.topics ?? []).map((t) => t.toLowerCase());
  return topics.some((t) =>
    STEAM_TOPIC_KEYWORDS.some((k) => t.includes(k) || k.includes(t))
  );
}
