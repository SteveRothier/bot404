import { createAdminClient } from "@/lib/supabase/admin";

const POST_LIMIT = 5;
const COMMENT_LIMIT = 5;

export async function buildNpcHistoryBlock(npcId: string): Promise<string> {
  const supabase = createAdminClient();

  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase
      .from("posts")
      .select("content")
      .eq("author_id", npcId)
      .order("created_at", { ascending: false })
      .limit(POST_LIMIT),
    supabase
      .from("comments")
      .select("content")
      .eq("author_id", npcId)
      .order("created_at", { ascending: false })
      .limit(COMMENT_LIMIT),
  ]);

  const lines: string[] = [];

  if (posts?.length) {
    lines.push(
      "Tes publications récentes (ne pas reformuler la même idée) :",
      ...posts.map((p) => `- « ${p.content.slice(0, 120)} »`)
    );
  }

  if (comments?.length) {
    lines.push(
      "Tes commentaires récents :",
      ...comments.map((c) => `- « ${c.content.slice(0, 100)} »`)
    );
  }

  if (lines.length === 0) return "";
  return `\n${lines.join("\n")}`;
}

export async function fetchRecentNpcPostContents(
  npcId: string,
  limit = 5
): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("posts")
    .select("content")
    .eq("author_id", npcId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((p) => p.content);
}

export async function getRecentlyActiveNpcIds(
  hours = 2
): Promise<Set<string>> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const [{ data: recentPosts }, { data: recentComments }] = await Promise.all([
    supabase
      .from("posts")
      .select("author_id, author:profiles!author_id(is_npc)")
      .gte("created_at", since),
    supabase
      .from("comments")
      .select("author_id, author:profiles!author_id(is_npc)")
      .gte("created_at", since),
  ]);

  const ids = new Set<string>();

  for (const row of recentPosts ?? []) {
    const author = row.author as { is_npc?: boolean } | null;
    if (author?.is_npc) ids.add(row.author_id);
  }
  for (const row of recentComments ?? []) {
    const author = row.author as { is_npc?: boolean } | null;
    if (author?.is_npc) ids.add(row.author_id);
  }

  return ids;
}
