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

type SignalContext = {
  humanUsername: string | null;
  triggerPostId: number | null;
};

async function resolveSignalContexts(
  signalIds: number[]
): Promise<Map<number, SignalContext>> {
  const unique = [...new Set(signalIds.filter((id) => id > 0))];
  const result = new Map<number, SignalContext>();
  if (unique.length === 0) return result;

  const supabase = createAdminClient();
  const { data: signals } = await supabase
    .from("narrative_signals")
    .select("id, author_id, post_id")
    .in("id", unique);

  if (!signals?.length) return result;

  const authorIds = [
    ...new Set(signals.map((s) => s.author_id).filter(Boolean)),
  ] as string[];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", authorIds);

  const usernameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.username] as const)
  );

  for (const signal of signals) {
    result.set(signal.id, {
      humanUsername: signal.author_id
        ? (usernameById.get(signal.author_id) ?? null)
        : null,
      triggerPostId: signal.post_id ?? null,
    });
  }

  return result;
}

async function resolveSignalContext(signalId: number | null): Promise<SignalContext> {
  if (!signalId) return { humanUsername: null, triggerPostId: null };
  const map = await resolveSignalContexts([signalId]);
  return map.get(signalId) ?? { humanUsername: null, triggerPostId: null };
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

  const signalIds = [
    ...(comments ?? []).map((c) => c.narrative_signal_id),
    ...(posts ?? []).map((p) => p.narrative_signal_id),
  ].filter((id): id is number => id != null);

  const contexts = await resolveSignalContexts(signalIds);
  const rows: NarrativeInteractionRow[] = [];

  for (const c of comments ?? []) {
    const author = c.author as { username?: string; is_npc?: boolean } | null;
    if (!author?.is_npc || !c.narrative_signal_id) continue;

    const ctx = contexts.get(c.narrative_signal_id) ?? {
      humanUsername: null,
      triggerPostId: null,
    };

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
    if (!author?.is_npc || !p.narrative_signal_id) continue;

    const ctx = contexts.get(p.narrative_signal_id) ?? {
      humanUsername: null,
      triggerPostId: null,
    };

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
