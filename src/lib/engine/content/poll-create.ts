import { insertPostPoll } from "@/lib/queries/posts";
import {
  createServerOllamaProvider,
} from "@/lib/engine/content/ollama";
import type { OllamaProvider } from "@/lib/ollama-bridge";
import { npcBase } from "@/lib/engine/content/prompt";
import { validatePollDraft, type PollDraftInput } from "@/lib/polls";
import type { PostType, Profile } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NpcPollContext = "ambient" | "emergent" | "beat";

const CONTEXT_MULTIPLIER: Record<NpcPollContext, number> = {
  ambient: 1,
  emergent: 0.5,
  beat: 0.35,
};

const TYPE_MULTIPLIER: Record<PostType, number> = {
  message: 1,
  theory: 0.7,
  rumor: 0.7,
  signal: 0,
};

const DURATION_PRESETS_MINUTES = [360, 720, 1440, 2880] as const;

const FALLBACK_OPTION_PAIRS: [string, string][] = [
  ["Oui", "Non"],
  ["Vrai", "Faux"],
  ["Pour", "Contre"],
  ["Probable", "Improbable"],
];

function baseNpcPollChance(): number {
  const raw = Number(process.env.NPC_POLL_CHANCE ?? "0.12");
  if (!Number.isFinite(raw) || raw < 0) return 0.12;
  return Math.min(1, raw);
}

export function shouldNpcAttachPoll(
  postType: PostType,
  hasMedia: boolean,
  context: NpcPollContext,
  random = Math.random
): boolean {
  if (hasMedia || postType === "signal") return false;

  const chance =
    baseNpcPollChance() *
    (CONTEXT_MULTIPLIER[context] ?? 1) *
    (TYPE_MULTIPLIER[postType] ?? 0.5);

  return random() < chance;
}

export function parseNpcPollOptionsJson(raw: string): string[] | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { options?: unknown };
    if (!parsed || !Array.isArray(parsed.options)) return null;
    const options = parsed.options
      .filter((o): o is string => typeof o === "string")
      .map((o) => o.trim())
      .filter(Boolean);
    return options.length >= 2 ? options : null;
  } catch {
    return null;
  }
}

export function fallbackNpcPollOptions(random = Math.random): string[] {
  const pair =
    FALLBACK_OPTION_PAIRS[
      Math.floor(random() * FALLBACK_OPTION_PAIRS.length)
    ] ?? FALLBACK_OPTION_PAIRS[0];
  return [...pair];
}

export function pickNpcPollDurationMinutes(random = Math.random): number {
  const index = Math.floor(random() * DURATION_PRESETS_MINUTES.length);
  return DURATION_PRESETS_MINUTES[index] ?? 1440;
}

export async function generateNpcPollOptions(
  npc: Profile,
  content: string,
  postType: PostType,
  durationMinutes: number,
  provider: OllamaProvider = createServerOllamaProvider()
): Promise<PollDraftInput | null> {
  const system = `${npcBase(npc)}
Tu crées les choix d'un sondage pour un post (${postType}) sur Bot404.
Réponds UNIQUEMENT avec un JSON valide : {"options":["choix1","choix2"]}
Entre 2 et 4 choix, max 25 caractères chacun, en français.`;

  const user = `Texte du post (question ou sujet) :\n${content.slice(0, 400)}`;

  const raw = await provider.chat(system, user, 200, "comment");
  let options = raw ? parseNpcPollOptionsJson(raw) : null;

  if (!options) {
    options = fallbackNpcPollOptions();
  }

  const draft: PollDraftInput = { options, durationMinutes };
  if (validatePollDraft(draft)) {
    return { options: fallbackNpcPollOptions(), durationMinutes };
  }

  return draft;
}

export async function maybeAttachNpcPoll(params: {
  supabase: SupabaseClient;
  postId: number;
  npc: Profile;
  content: string;
  postType: PostType;
  hasMedia: boolean;
  context: NpcPollContext;
  random?: () => number;
  /** Si true, saute le tirage (déjà fait en amont, ex. exclusivité média). */
  forceAttach?: boolean;
  provider?: OllamaProvider;
}): Promise<boolean> {
  const random = params.random ?? Math.random;

  if (
    !params.forceAttach &&
    !shouldNpcAttachPoll(
      params.postType,
      params.hasMedia,
      params.context,
      random
    )
  ) {
    return false;
  }

  if (params.hasMedia || params.postType === "signal") {
    return false;
  }

  const durationMinutes = pickNpcPollDurationMinutes(random);
  const draft = await generateNpcPollOptions(
    params.npc,
    params.content,
    params.postType,
    durationMinutes,
    params.provider
  );

  if (!draft) return false;

  const result = await insertPostPoll(params.supabase, params.postId, draft);
  return result.ok;
}
