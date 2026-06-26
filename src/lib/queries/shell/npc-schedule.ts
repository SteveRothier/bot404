import { createPublicClient } from "@/lib/supabase/public";

async function getLastNpcContentTime(
  table: "posts" | "comments"
): Promise<Date | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from(table)
    .select("created_at, author:profiles!inner(is_npc)")
    .eq("author.is_npc", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.created_at) return null;
  return new Date(data.created_at);
}

export async function getLastNpcPostTime(): Promise<Date | null> {
  return getLastNpcContentTime("posts");
}

export async function getLastNpcCommentTime(): Promise<Date | null> {
  return getLastNpcContentTime("comments");
}
