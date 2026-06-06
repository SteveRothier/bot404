import { maybePromoteRumorToEvent } from "@/lib/rumor-events";
import { createAdminClient } from "@/lib/supabase/admin";

const THEORY_DOSSIER_THRESHOLD = 3;
const FLAG_ESCALATION_THRESHOLD = 5;

/** Escalade lore après interactions humaines (complète rumor-events). */
export async function runNarrativeEscalation(postId: number) {
  const supabase = createAdminClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, post_type, content, flag_count, relay_count, amplify_count, author:profiles!author_id(is_npc)"
    )
    .eq("id", postId)
    .maybeSingle();

  if (!post) return;

  const author = post.author as { is_npc?: boolean } | null;
  if (author?.is_npc) {
    await maybePromoteRumorToEvent(postId);
    return;
  }

  if (post.post_type === "rumor" || post.post_type === "theory") {
    await maybePromoteRumorToEvent(postId);
  }

  if ((post.flag_count ?? 0) >= FLAG_ESCALATION_THRESHOLD) {
    const slug = `human-flagged-${postId}`;
    const { data: existing } = await supabase
      .from("world_events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!existing) {
      await supabase.from("world_events").insert({
        slug,
        title: "Post signalé — audit PurBots",
        description: `Un post humain (#${postId}) a dépassé le seuil de signalements. Les PurBots lancent un audit.`,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        effects: {
          factions: ["purbots"],
          boost_post_types: ["theory"],
          banner_copy: "Audit PurBots en cours sur contenu humain signalé.",
          source_post_id: postId,
        },
      });
    }
  }

  if (post.post_type === "theory") {
    const { count } = await supabase
      .from("investigation_entries")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if ((count ?? 0) >= THEORY_DOSSIER_THRESHOLD) {
      const slug = `theory-hot-${postId}`;
      const { data: existing } = await supabase
        .from("world_events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!existing) {
        await supabase.from("world_events").insert({
          slug,
          title: "Théorie communautaire validée",
          description: `La théorie #${postId} accumule des preuves dans les dossiers.`,
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          effects: {
            boost_post_types: ["theory", "rumor"],
            source_post_id: postId,
          },
        });
      }
    }
  }
}

/** Drama si plusieurs NPC mentionnés sur un post humain. */
export async function maybeTriggerMentionDrama(
  postId: number,
  mentionCount: number
) {
  if (mentionCount < 2) return;

  const supabase = createAdminClient();
  const slug = `mention-drama-${postId}`;
  const { data: existing } = await supabase
    .from("world_events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return;

  await supabase.from("world_events").insert({
    slug,
    title: "Drama NPC — mentions croisées",
    description:
      "Plusieurs NPC ont été mentionnés sur un même fil. Le réseau bascule en mode drama.",
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    effects: {
      boost_post_types: ["rumor", "message"],
      banner_copy:
        "Tension entre NPC après mentions croisées sur un post humain.",
      source_post_id: postId,
    },
  });
}
