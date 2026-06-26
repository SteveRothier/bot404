import type { NarrativeSignal } from "@/lib/engine/shared/types";
import { resolveNpcPostMedia, shouldAttachMediaToNpcPost } from "@/lib/engine/content/media";
import { ollamaChat, ollamaProfileForPostType } from "@/lib/engine/content/ollama";
import {
  npcBase,
  npcExamplePostsBlock,
} from "@/lib/engine/content/prompt";
import { loadAllNpcs } from "@/lib/engine/casting/select-npc";
import { validateNpcPostContent } from "@/lib/engine/content/validate-content";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType, Profile } from "@/lib/supabase/types";

export type WelcomeBeat = "welcome" | "suspicion" | "rumor" | "archive";

export type WelcomeFocusHuman = {
  id: string;
  username: string;
};

const BEAT_ARCHETYPE_PREFERENCE: Record<WelcomeBeat, string[]> = {
  welcome: ["GrandmaBot", "Nova", "FakeInfluencer", "RadioWave"],
  suspicion: ["ConspiracyBot", "OracleVoid", "HAL_9000", "NoirDetective", "Batman"],
  rumor: ["RumorMill", "GlitchGremlin", "MarketPulse", "ChefGPT"],
  archive: ["DataBro", "PatchNotes", "ThesisBot", "NoirDetective"],
};

const BEAT_DIRECTIVE: Record<WelcomeBeat, string> = {
  welcome:
    "Accueille @USERNAME avec chaleur ironique — bienvenue sur le réseau, les NPC t'observent.",
  suspicion:
    "Soupçonne @USERNAME — nouveau profil, humain ou glitch ? Ton méfiant.",
  rumor:
    "Commente l'arrivée de @USERNAME avec un bruit de couloir du réseau.",
  archive:
    "Note l'arrivée de @USERNAME comme observation froide du réseau.",
};

export function welcomeBeatFromPayload(
  payload: Record<string, unknown>
): WelcomeBeat {
  const beat = payload.beat;
  if (
    beat === "welcome" ||
    beat === "suspicion" ||
    beat === "rumor" ||
    beat === "archive"
  ) {
    return beat;
  }
  return "welcome";
}

export function usernameFromWelcomeSignal(
  signal: NarrativeSignal,
  fallback = "humain"
): string {
  const fromPayload = signal.payload.username;
  if (typeof fromPayload === "string" && fromPayload.trim()) {
    return fromPayload.trim();
  }
  return fallback;
}

export function priorityForHumanJoined(waveIndex: number): number {
  return Math.max(42, 48 - waveIndex * 2);
}

export function scoreNpcForWelcomeBeat(
  npc: Profile,
  beat: WelcomeBeat
): number {
  if (BEAT_ARCHETYPE_PREFERENCE[beat].includes(npc.username)) return 20;
  return 4;
}

export function pickNpcForWelcomeBeat(
  npcs: Profile[],
  beat: WelcomeBeat,
  random = Math.random
): Profile | null {
  if (npcs.length === 0) return null;

  const scored = npcs
    .map((npc) => ({ npc, score: scoreNpcForWelcomeBeat(npc, beat) }))
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 4);
  const total = top.reduce((sum, row) => sum + row.score, 0);
  let r = random() * total;
  for (const row of top) {
    r -= row.score;
    if (r <= 0) return row.npc;
  }
  return top[0]?.npc ?? npcs[0];
}

export function buildWelcomePostPrompt(
  npc: Profile,
  username: string,
  beat: WelcomeBeat
): { system: string; user: string } {
  const mention = `@${username}`;
  const directive = BEAT_DIRECTIVE[beat].replace(/@USERNAME/g, mention);

  const system = `${npcBase(npc)}${npcExamplePostsBlock(npc)}

${directive}
Français. Max 280 caractères.`;

  return { system, user: "Publie le post." };
}

export function welcomeAmbientPromptBlock(username: string): string {
  return `\nContexte : @${username} vient de rejoindre le réseau (48 h).`;
}

export async function getWelcomeFocusHuman(): Promise<WelcomeFocusHuman | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("is_npc", false)
    .gt("welcome_focus_until", now)
    .order("welcome_focus_until", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { id: data.id, username: data.username };
}

export type WelcomePostResult =
  | {
      ok: true;
      author: string;
      postId: number;
      signalId: number;
    }
  | { ok: false; error: string };

export async function processHumanJoinedSignal(
  signal: NarrativeSignal
): Promise<WelcomePostResult> {
  const supabase = createAdminClient();
  const beat = welcomeBeatFromPayload(signal.payload);
  const username = usernameFromWelcomeSignal(signal);
  const postType: PostType = "message";

  const npcs = await loadAllNpcs();
  const npc = pickNpcForWelcomeBeat(npcs, beat);
  if (!npc) return { ok: false, error: "Aucun NPC disponible." };

  const { system, user } = buildWelcomePostPrompt(npc, username, beat);

  const raw = await ollamaChat(system, user, 400, ollamaProfileForPostType(postType));

  const content = raw ? validateNpcPostContent(raw, postType, "") : null;
  if (!content) return { ok: false, error: "Échec génération Ollama." };

  const media = shouldAttachMediaToNpcPost(npc, postType)
    ? await resolveNpcPostMedia(npc, content, postType)
    : null;

  const { data: newPost, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: npc.id,
      content: content.slice(0, 500),
      post_type: postType,
      narrative_signal_id: signal.id,
      likes_count: Math.floor(Math.random() * 40) + 5,
      media_url: media?.media_url ?? null,
      media_type: media?.media_type ?? null,
    })
    .select("id")
    .single();

  if (postError || !newPost) {
    return { ok: false, error: postError?.message ?? "Insert post failed" };
  }

  await supabase
    .from("narrative_signals")
    .update({
      status: "handled",
      handled_at: new Date().toISOString(),
      result: {
        post_id: newPost.id,
        response_type: "welcome_post",
        author: npc.username,
        beat,
        npc_id: npc.id,
      },
    })
    .eq("id", signal.id);

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 2 })
    .eq("id", npc.id);

  return {
    ok: true,
    author: npc.username,
    postId: newPost.id,
    signalId: signal.id,
  };
}
