import { createAdminClient } from "@/lib/supabase/admin";

const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** NPC ayant déjà commenté ou répondu sur ce fil récemment (anti-répétition). */
export async function getRecentNpcAuthorIdsOnPost(
  postId: number
): Promise<Set<string>> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - REPLY_WINDOW_MS).toISOString();
  const ids = new Set<string>();

  const { data: comments } = await supabase
    .from("comments")
    .select("author_id, author:profiles!author_id(is_npc)")
    .eq("post_id", postId)
    .gte("created_at", since);

  for (const row of comments ?? []) {
    const author = row.author as { is_npc?: boolean } | null;
    if (author?.is_npc) ids.add(row.author_id);
  }

  const { data: signals } = await supabase
    .from("narrative_signals")
    .select("result")
    .eq("status", "handled")
    .gte("handled_at", since);

  for (const sig of signals ?? []) {
    const result = sig.result as {
      post_id?: number;
      trigger_post_id?: number;
      author?: string;
    } | null;
    const target = result?.trigger_post_id ?? result?.post_id;
    if (target !== postId || !result?.author) continue;

    const { data: npc } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", result.author)
      .eq("is_npc", true)
      .maybeSingle();
    if (npc) ids.add(npc.id);
  }

  return ids;
}
