import { isRecentNarrativeResponse } from "@/lib/narrative/recent-response";
import { createClient } from "@/lib/supabase/server";
import type { CommentWithAuthor, Profile } from "@/lib/supabase/types";

export async function getCommentsByPostIds(
  postIds: number[],
  limitPerPost = 5
): Promise<Record<number, CommentWithAuthor[]>> {
  if (postIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles!author_id(*)")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (error || !data) return {};

  const grouped: Record<number, CommentWithAuthor[]> = {};
  for (const row of data) {
    const comment = {
      ...row,
      author: row.author as Profile,
      isRecentNarrativeResponse:
        !!row.narrative_signal_id &&
        (row.author as Profile).is_npc &&
        isRecentNarrativeResponse(row.created_at),
    } as CommentWithAuthor;
    const list = grouped[row.post_id] ?? [];
    list.push(comment);
    grouped[row.post_id] = list;
  }

  for (const id of postIds) {
    if (grouped[id] && grouped[id].length > limitPerPost) {
      grouped[id] = grouped[id].slice(-limitPerPost);
    }
  }

  return grouped;
}
