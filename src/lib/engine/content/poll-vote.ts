import { ollamaChat } from "@/lib/engine/content/ollama";
import { npcBase } from "@/lib/engine/content/prompt";
import { isPollExpired } from "@/lib/polls";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Personality, PostPollOption, Profile } from "@/lib/supabase/types";

export type NpcPollVoteResult =
  | { ok: true; optionId: number; label: string }
  | { ok: false; reason: string };

async function loadActivePoll(postId: number) {
  const supabase = createAdminClient();
  const { data: poll } = await supabase
    .from("post_polls")
    .select("post_id, ends_at")
    .eq("post_id", postId)
    .maybeSingle();

  if (!poll || isPollExpired(poll.ends_at)) return null;

  const { data: options } = await supabase
    .from("post_poll_options")
    .select("id, label, position, votes_count")
    .eq("post_id", postId)
    .order("position", { ascending: true });

  if (!options?.length) return null;
  return { ...poll, options: options as PostPollOption[] };
}

function pickRandomOption(
  options: PostPollOption[]
): PostPollOption {
  const weights = options.map((o) => Math.max(1, o.votes_count + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return options[i];
  }
  return options[options.length - 1];
}

async function pickOptionWithOllama(
  npc: Profile,
  question: string,
  options: PostPollOption[]
): Promise<PostPollOption | null> {
  const p = (npc.personality ?? {}) as Personality;
  const labels = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");

  const system = `${npcBase(npc)}
Tu votes sur un sondage. Réponds UNIQUEMENT par le numéro du choix (1-${options.length}), sans autre texte.`;

  const user = `Question : ${question}\n\nChoix :\n${labels}`;

  const raw = await ollamaChat(system, user, 8, "comment");
  if (!raw) return null;

  const match = raw.trim().match(/^(\d+)/);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  if (index < 0 || index >= options.length) return null;
  return options[index];
}

export async function maybeNpcVoteOnPoll(
  postId: number,
  npc: Profile,
  question: string
): Promise<NpcPollVoteResult> {
  const supabase = createAdminClient();
  const poll = await loadActivePoll(postId);
  if (!poll) return { ok: false, reason: "Pas de sondage actif." };

  const { data: existing } = await supabase
    .from("post_poll_votes")
    .select("option_id")
    .eq("post_id", postId)
    .eq("voter_id", npc.id)
    .maybeSingle();

  if (existing) return { ok: false, reason: "Déjà voté." };

  let chosen =
    (await pickOptionWithOllama(npc, question, poll.options)) ??
    pickRandomOption(poll.options);

  const { error } = await supabase.rpc("apply_poll_vote_npc", {
    p_post_id: postId,
    p_voter_id: npc.id,
    p_new_option_id: chosen.id,
  });

  if (error) return { ok: false, reason: error.message };

  return { ok: true, optionId: chosen.id, label: chosen.label };
}
