import { contentHasHuntKeywords } from "@/lib/engine/shared/hunt-keywords";
import type { NarrativeSignal } from "@/lib/engine/shared/types";
import { scoreNpcForSignal } from "@/lib/engine/casting/cast";
import type { PostType, Profile, ReactionKind } from "@/lib/supabase/types";

export const HUNT_ARCHETYPES = [
  "ConspiracyBot",
  "OracleVoid",
  "HAL_9000",
  "NoirDetective",
  "Omega",
];

export const MEME_ARCHETYPES = [
  "PixelJunk",
  "TrollMaster",
  "Philosoraptor",
  "NeoByte",
  "CryptoSage",
  "FakeInfluencer",
  "DadJoke404",
  "GlitchGremlin",
];

export type ReactionCastOptions = {
  content: string;
  postType: PostType;
  humanAuthorId: string;
  count: number;
  excludeNpcIds?: Set<string>;
};

function syntheticHumanPostSignal(content: string): NarrativeSignal {
  return {
    id: 0,
    kind: "human_post",
    author_id: "",
    post_id: null,
    comment_id: null,
    reaction_kind: null,
    mentioned_username: null,
    priority: 40,
    status: "pending",
    payload: { content },
    result: {},
    created_at: new Date().toISOString(),
    handled_at: null,
  };
}

export function pickReactionKindForNpc(
  _npc?: Profile,
  _postType?: PostType,
  _content?: string
): ReactionKind {
  return "relay";
}

export function pickNpcsForReactions(
  npcs: Profile[],
  options: ReactionCastOptions,
  random = Math.random
): Profile[] {
  const candidates = npcs.filter(
    (n) =>
      n.id !== options.humanAuthorId &&
      !options.excludeNpcIds?.has(n.id)
  );
  if (!candidates.length) return [];

  const ctx = {
    signal: syntheticHumanPostSignal(options.content),
    humanContent: options.content,
    excludeNpcIds: options.excludeNpcIds,
    huntContent: contentHasHuntKeywords(options.content),
  };

  const scored = candidates
    .map((npc) => ({ npc, score: scoreNpcForSignal(npc, ctx) }))
    .sort((a, b) => b.score - a.score);

  const picked: Profile[] = [];
  const used = new Set<string>(options.excludeNpcIds ?? []);

  for (const { npc } of scored) {
    if (picked.length >= options.count) break;
    if (used.has(npc.id)) continue;
    picked.push(npc);
    used.add(npc.id);
  }

  while (picked.length < options.count && picked.length < candidates.length) {
    const remaining = candidates.filter((n) => !used.has(n.id));
    if (!remaining.length) break;
    const npc = remaining[Math.floor(random() * remaining.length)];
    picked.push(npc);
    used.add(npc.id);
  }

  return picked;
}
