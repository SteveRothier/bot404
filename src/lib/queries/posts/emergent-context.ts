import { createAdminClient } from "@/lib/supabase/admin";

export type EmergentPostContext = {
  humanUsername: string;
  triggerPostId: number | null;
};

type SignalContext = {
  humanUsername: string | null;
  triggerPostId: number | null;
};

async function resolveSignalContext(signalId: number | null): Promise<SignalContext> {
  if (!signalId) return { humanUsername: null, triggerPostId: null };

  const supabase = createAdminClient();
  const { data: signal } = await supabase
    .from("narrative_signals")
    .select("id, author_id, post_id")
    .eq("id", signalId)
    .maybeSingle();

  if (!signal) return { humanUsername: null, triggerPostId: null };
  if (!signal.author_id) {
    return { humanUsername: null, triggerPostId: signal.post_id ?? null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", signal.author_id)
    .maybeSingle();

  return {
    humanUsername: profile?.username ?? null,
    triggerPostId: signal.post_id ?? null,
  };
}

export async function getEmergentPostContext(
  postId: number
): Promise<EmergentPostContext | null> {
  const supabase = createAdminClient();
  const { data: post } = await supabase
    .from("posts")
    .select("narrative_signal_id, author:profiles!author_id(is_npc)")
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
