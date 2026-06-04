import { mergeNarrativeInteractions } from "@/lib/queries/narrative-ui-merge";
import { createAdminClient } from "@/lib/supabase/admin";

export type NarrativeInteractionRow = {
  id: number;
  kind: "comment" | "post";
  content: string;
  created_at: string;
  link_post_id: number;
  /** Post humain qui a déclenché le signal (si différent de link_post_id). */
  trigger_post_id: number | null;
  npc_username: string;
  human_username: string | null;
};

export type EmergentPostContext = {
  humanUsername: string;
  triggerPostId: number | null;
};

async function resolveSignalContext(signalId: number | null): Promise<{
  humanUsername: string | null;
  triggerPostId: number | null;
}> {
  if (!signalId) return { humanUsername: null, triggerPostId: null };

  const supabase = createAdminClient();
  const { data: signal } = await supabase
    .from("narrative_signals")
    .select("author_id, post_id")
    .eq("id", signalId)
    .maybeSingle();

  if (!signal?.author_id) {
    return { humanUsername: null, triggerPostId: signal?.post_id ?? null };
  }

  const { data: human } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", signal.author_id)
    .maybeSingle();

  return {
    humanUsername: human?.username ?? null,
    triggerPostId: signal.post_id ?? null,
  };
}

export async function getEmergentPostContext(
  postId: number
): Promise<EmergentPostContext | null> {
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "narrative_signal_id, author:profiles!author_id(is_npc)"
    )
    .eq("id", postId)
    .maybeSingle();

  if (!post?.narrative_signal_id) return null;

  const author = post.author as { is_npc?: boolean } | null;
  if (!author?.is_npc) return null;

  const ctx = await resolveSignalContext(post.narrative_signal_id);
  if (!ctx.humanUsername) return null;

  return {
    humanUsername: ctx.humanUsername,
    triggerPostId: ctx.triggerPostId,
  };
}

export async function getRecentNarrativeInteractions(
  limit = 8
): Promise<NarrativeInteractionRow[]> {
  const supabase = createAdminClient();
  const fetchLimit = Math.max(limit * 2, 16);

  const [{ data: comments }, { data: posts }] = await Promise.all([
    supabase
      .from("comments")
      .select(
        "id, content, created_at, post_id, narrative_signal_id, author:profiles!author_id(username, is_npc)"
      )
      .not("narrative_signal_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("posts")
      .select(
        "id, content, created_at, narrative_signal_id, author:profiles!author_id(username, is_npc)"
      )
      .not("narrative_signal_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
  ]);

  const rows: NarrativeInteractionRow[] = [];

  for (const c of comments ?? []) {
    const author = c.author as { username?: string; is_npc?: boolean } | null;
    if (!author?.is_npc) continue;

    const ctx = await resolveSignalContext(c.narrative_signal_id);

    rows.push({
      id: c.id,
      kind: "comment",
      content: c.content,
      created_at: c.created_at,
      link_post_id: c.post_id,
      trigger_post_id: ctx.triggerPostId,
      npc_username: author.username ?? "?",
      human_username: ctx.humanUsername,
    });
  }

  for (const p of posts ?? []) {
    const author = p.author as { username?: string; is_npc?: boolean } | null;
    if (!author?.is_npc) continue;

    const ctx = await resolveSignalContext(p.narrative_signal_id);

    rows.push({
      id: p.id,
      kind: "post",
      content: p.content,
      created_at: p.created_at,
      link_post_id: p.id,
      trigger_post_id: ctx.triggerPostId,
      npc_username: author.username ?? "?",
      human_username: ctx.humanUsername,
    });
  }

  return mergeNarrativeInteractions(rows, limit);
}
