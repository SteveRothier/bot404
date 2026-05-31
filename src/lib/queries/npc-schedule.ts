import { createClient } from "@/lib/supabase/server";

async function getLastNpcContentTime(
  table: "posts" | "comments"
): Promise<Date | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(table)
    .select("created_at, author:profiles!author_id(is_npc)")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return null;

  const row = data.find(
    (item) =>
      item.author &&
      typeof item.author === "object" &&
      "is_npc" in item.author &&
      item.author.is_npc
  );

  return row?.created_at ? new Date(row.created_at) : null;
}

export async function getLastNpcPostTime(): Promise<Date | null> {
  return getLastNpcContentTime("posts");
}

export async function getLastNpcCommentTime(): Promise<Date | null> {
  return getLastNpcContentTime("comments");
}
