import { mergeNarrativeInteractions } from "@/lib/queries/narrative-ui-merge";
import { createAdminClient } from "@/lib/supabase/admin";

export type NarrativeInteractionRow = {
  id: number;
  kind: "comment" | "post";
  content: string;
  created_at: string;
  link_post_id: number;
  npc_username: string;
  human_username: string | null;
};

async function resolveHumanFromSignal(
  signalId: number | null
): Promise<string | null> {
  if (!signalId) return null;

  const supabase = createAdminClient();
  const { data: signal } = await supabase
    .from("narrative_signals")
    .select("author_id")
    .eq("id", signalId)
    .maybeSingle();

  if (!signal?.author_id) return null;

  const { data: human } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", signal.author_id)
    .maybeSingle();

  return human?.username ?? null;
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

    rows.push({
      id: c.id,
      kind: "comment",
      content: c.content,
      created_at: c.created_at,
      link_post_id: c.post_id,
      npc_username: author.username ?? "?",
      human_username: await resolveHumanFromSignal(c.narrative_signal_id),
    });
  }

  for (const p of posts ?? []) {
    const author = p.author as { username?: string; is_npc?: boolean } | null;
    if (!author?.is_npc) continue;

    rows.push({
      id: p.id,
      kind: "post",
      content: p.content,
      created_at: p.created_at,
      link_post_id: p.id,
      npc_username: author.username ?? "?",
      human_username: await resolveHumanFromSignal(p.narrative_signal_id),
    });
  }

  return mergeNarrativeInteractions(rows, limit);
}
