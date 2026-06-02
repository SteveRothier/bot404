import { createAdminClient } from "@/lib/supabase/admin";

const RUMOR_THRESHOLD = 8;

/** Si une rumeur dépasse le seuil relay+amplify en 24h, crée un mini-événement. */
export async function maybePromoteRumorToEvent(postId: number) {
  const supabase = createAdminClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id, post_type, content, relay_count, amplify_count, created_at")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.post_type !== "rumor") return;

  const score = (post.relay_count ?? 0) + (post.amplify_count ?? 0);
  if (score < RUMOR_THRESHOLD) return;

  const created = new Date(post.created_at).getTime();
  if (Date.now() - created > 24 * 60 * 60 * 1000) return;

  const slug = `rumor-boost-${postId}`;
  const { data: existing } = await supabase
    .from("world_events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return;

  await supabase.from("world_events").insert({
    slug,
    title: "Rumeur amplifiée",
    description: `Une rumeur (#${postId}) a franchi le seuil de propagation (${score} relais/amplifications).`,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    effects: { source_post_id: postId, type: "rumor_boost" },
  });

  await supabase
    .from("archives")
    .update({ unlocked_at: new Date().toISOString() })
    .eq("slug", "blackout-7g")
    .is("unlocked_at", null);

  return { unlockedArchiveSlug: "blackout-7g" };
}
