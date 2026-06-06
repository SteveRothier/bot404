import { processPostFactionEffects } from "@/lib/factions/simulation";
import {
  buildBeatCommentPrompt,
  buildBeatPostPrompt,
} from "@/lib/narrative/build-prompt";
import {
  getBeatByArcAndOrder,
  getActiveEmergentArc,
} from "@/lib/narrative/queries";
import type {
  NarrativeArc,
  NarrativeBeat,
  NpcCommentBeatPayload,
  NpcPostBeatPayload,
} from "@/lib/narrative/types";
import { ollamaChat } from "@/lib/npc/ollama";
import { isValidPostType, pickRandomNpcPostType } from "@/lib/post-types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostType, Profile } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getNpcByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_npc", true)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

async function resolveReplyPostId(
  supabase: SupabaseClient,
  arcId: number,
  payload: NpcCommentBeatPayload
): Promise<number | null> {
  if (payload.reply_to_beat_id) {
    const { data } = await supabase
      .from("narrative_beats")
      .select("result")
      .eq("id", payload.reply_to_beat_id)
      .maybeSingle();
    const postId = (data?.result as { post_id?: number })?.post_id;
    return postId ?? null;
  }

  if (payload.reply_to_beat_order) {
    const beat = await getBeatByArcAndOrder(arcId, payload.reply_to_beat_order);
    const postId = (beat?.result as { post_id?: number })?.post_id;
    return postId ?? null;
  }

  return null;
}

async function markBeatDone(
  supabase: SupabaseClient,
  beatId: number,
  result: Record<string, unknown>
) {
  await supabase
    .from("narrative_beats")
    .update({ status: "done", result })
    .eq("id", beatId);
}

async function markBeatFailed(supabase: SupabaseClient, beatId: number) {
  await supabase
    .from("narrative_beats")
    .update({ status: "failed" })
    .eq("id", beatId);
}

async function executeNpcPostBeat(
  supabase: SupabaseClient,
  arc: NarrativeArc,
  beat: NarrativeBeat
): Promise<Record<string, unknown> | null> {
  const payload = beat.payload as NpcPostBeatPayload;
  const npc = await getNpcByUsername(supabase, payload.npc_username);
  if (!npc) return null;

  const postType: PostType =
    payload.post_type && isValidPostType(payload.post_type)
      ? payload.post_type
      : pickRandomNpcPostType();

  const system = await buildBeatPostPrompt(npc, arc, beat);
  const user =
    postType === "theory"
      ? "Écris la théorie demandée pour le feed."
      : postType === "signal"
        ? "Émet le signal demandé."
        : postType === "rumor"
          ? "Diffuse la rumeur demandée."
          : "Écris le post demandé.";

  const content = await ollamaChat(system, user);
  if (!content) return null;

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: npc.id,
      content: content.slice(0, 500),
      post_type: postType,
      narrative_beat_id: beat.id,
      likes_count: Math.floor(Math.random() * 200) + 30,
    })
    .select("id")
    .single();

  if (error || !post) return null;

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  await processPostFactionEffects(supabase, post.id);

  return { post_id: post.id, author: npc.username, post_type: postType };
}

async function executeNpcCommentBeat(
  supabase: SupabaseClient,
  arc: NarrativeArc,
  beat: NarrativeBeat
): Promise<Record<string, unknown> | null> {
  const payload = beat.payload as NpcCommentBeatPayload;
  const npc = await getNpcByUsername(supabase, payload.npc_username);
  if (!npc) return null;

  const postId = await resolveReplyPostId(supabase, arc.id, payload);
  if (!postId) return null;

  const { data: parentPost } = await supabase
    .from("posts")
    .select("content")
    .eq("id", postId)
    .maybeSingle();

  if (!parentPost) return null;

  const { system, user } = await buildBeatCommentPrompt(
    npc,
    arc,
    beat,
    parentPost.content
  );

  const content = await ollamaChat(system, user, 300);
  if (!content) return null;

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: npc.id,
      content: content.slice(0, 300),
      narrative_beat_id: beat.id,
    })
    .select("id")
    .single();

  if (error || !comment) return null;

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  return {
    comment_id: comment.id,
    post_id: postId,
    author: npc.username,
  };
}

async function executeArchiveUnlock(
  supabase: SupabaseClient,
  slug: string
): Promise<Record<string, unknown>> {
  await supabase
    .from("archives")
    .update({ unlocked_at: new Date().toISOString() })
    .eq("slug", slug)
    .is("unlocked_at", null);

  return { archive_slug: slug };
}

async function executeWorldEventBeat(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const slug =
    typeof payload.event_slug === "string" ? payload.event_slug : "chasse-humains";

  if (payload.intensify) {
    await supabase
      .from("world_events")
      .update({
        description:
          "Les factions PurBots et Assimilateurs intensifient la détection. Le réseau entre en alerte maximale.",
        ends_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        effects: {
          factions: ["purbots", "assimilateurs"],
          banner_copy:
            "Alerte maximale — théories et rumeurs sous surveillance renforcée.",
          boost_post_types: ["theory", "rumor"],
        },
      })
      .eq("slug", slug);
  }

  return { event_slug: slug, intensified: !!payload.intensify };
}

async function executeArcComplete(
  supabase: SupabaseClient,
  arc: NarrativeArc,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  await supabase
    .from("narrative_arcs")
    .update({ status: "completed", ends_at: new Date().toISOString() })
    .eq("id", arc.id);

  const nextSlug =
    typeof payload.next_arc_slug === "string"
      ? payload.next_arc_slug
      : "reseau-reactif";

  await supabase
    .from("narrative_arcs")
    .update({ status: "active" })
    .eq("slug", nextSlug);

  return { completed_arc: arc.slug, activated_arc: nextSlug };
}

export async function executeBeat(
  beat: NarrativeBeat & { arc: NarrativeArc }
): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  const supabase = createAdminClient();

  try {
    let result: Record<string, unknown> | null = {};

    switch (beat.kind) {
      case "npc_post":
        result = await executeNpcPostBeat(supabase, beat.arc, beat);
        break;
      case "npc_comment":
        result = await executeNpcCommentBeat(supabase, beat.arc, beat);
        break;
      case "archive_unlock": {
        const slug =
          typeof beat.payload.archive_slug === "string"
            ? beat.payload.archive_slug
            : "blackout-7g";
        result = await executeArchiveUnlock(supabase, slug);
        break;
      }
      case "world_event":
        result = await executeWorldEventBeat(supabase, beat.payload);
        break;
      case "pause":
        result = {
          message:
            typeof beat.payload.message === "string"
              ? beat.payload.message
              : "Pause narrative",
        };
        break;
      case "arc_complete":
        result = await executeArcComplete(supabase, beat.arc, beat.payload);
        break;
      case "dossier_entry":
        result = { skipped: true, reason: "dossier_entry not scripted in MVP" };
        break;
      default:
        return { ok: false, error: `Beat kind inconnu: ${beat.kind}` };
    }

    if (result === null) {
      await markBeatFailed(supabase, beat.id);
      return { ok: false, error: "Exécution du beat échouée" };
    }

    await markBeatDone(supabase, beat.id, result);
    return { ok: true, result };
  } catch (e) {
    await markBeatFailed(supabase, beat.id);
    const message = e instanceof Error ? e.message : "Erreur beat";
    return { ok: false, error: message };
  }
}

export async function getEmergentArcSynopsis(): Promise<string> {
  const arc = await getActiveEmergentArc();
  return arc?.synopsis ?? "Le réseau réagit aux traces humaines.";
}
