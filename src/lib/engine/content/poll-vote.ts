import {
  createServerOllamaProvider,
} from "@/lib/engine/content/ollama";
import type { OllamaProvider } from "@/lib/ollama-bridge";
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
  options: PostPollOption[],
  provider: OllamaProvider = createServerOllamaProvider()
): Promise<PostPollOption | null> {
  const p = (npc.personality ?? {}) as Personality;
  const labels = options.map((o, i) => `${i + 1}. ${o.label}`).join("\n");

  const system = `${npcBase(npc)}
Tu votes sur un sondage. Réponds UNIQUEMENT par le numéro du choix (1-${options.length}), sans autre texte.`;

  const user = `Question : ${question}\n\nChoix :\n${labels}`;

  const raw = await provider.chat(system, user, 8, "comment");
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
  question: string,
  provider: OllamaProvider = createServerOllamaProvider()
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
    (await pickOptionWithOllama(npc, question, poll.options, provider)) ??
    pickRandomOption(poll.options);

  const { error } = await supabase.rpc("apply_poll_vote_npc", {
    p_post_id: postId,
    p_voter_id: npc.id,
    p_new_option_id: chosen.id,
  });

  if (error) return { ok: false, reason: error.message };

  return { ok: true, optionId: chosen.id, label: chosen.label };
}

type ActivePollRow = {
  post_id: number;
  posts: { content: string } | { content: string }[] | null;
};

function pollQuestion(row: ActivePollRow): string {
  const posts = row.posts;
  if (Array.isArray(posts)) return posts[0]?.content ?? "";
  return posts?.content ?? "";
}

/** Votes NPC sur des sondages actifs (hors commentaires déjà générateurs). */
export async function maybeAmbientNpcPollVotes(
  maxVotes: number,
  provider: OllamaProvider = createServerOllamaProvider()
): Promise<number> {
  if (maxVotes < 1) return 0;

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: polls } = await supabase
    .from("post_polls")
    .select("post_id, posts!inner(content)")
    .gt("ends_at", now)
    .order("ends_at", { ascending: true })
    .limit(20);

  if (!polls?.length) return 0;

  const { data: npcs } = await supabase
    .from("profiles")
    .select("id, username, personality, popularity_score, trust_score, influence_score, is_npc, avatar_url, bio, welcome_focus_until, created_at")
    .eq("is_npc", true);

  if (!npcs?.length) return 0;

  const shuffled = [...(polls as ActivePollRow[])].sort(() => Math.random() - 0.5);
  let votes = 0;

  for (const poll of shuffled) {
    if (votes >= maxVotes) break;

    const question = pollQuestion(poll);
    if (!question) continue;

    const npcOrder = [...npcs].sort(() => Math.random() - 0.5);
    for (const npc of npcOrder) {
      if (votes >= maxVotes) break;
      const result = await maybeNpcVoteOnPoll(
        poll.post_id,
        npc as Profile,
        question,
        provider
      );
      if (result.ok) votes += 1;
    }
  }

  return votes;
}
