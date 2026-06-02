import { createClient } from "@/lib/supabase/server";
import type { Archive } from "@/lib/supabase/types";

export async function getUnlockedArchives(): Promise<Archive[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("archives")
    .select("*")
    .not("unlocked_at", "is", null)
    .lte("unlocked_at", now)
    .order("unlocked_at", { ascending: false });

  if (error || !data) return [];
  return data as Archive[];
}

export async function getLatestUnlockedArchive(): Promise<Archive | null> {
  const archives = await getUnlockedArchives();
  return archives[0] ?? null;
}

export async function getRecentlyUnlockedArchives(
  withinHours = 168
): Promise<Archive[]> {
  const supabase = await createClient();
  const since = new Date(
    Date.now() - withinHours * 60 * 60 * 1000
  ).toISOString();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("archives")
    .select("*")
    .not("unlocked_at", "is", null)
    .gte("unlocked_at", since)
    .lte("unlocked_at", now)
    .order("unlocked_at", { ascending: false });

  if (error || !data) return [];
  return data as Archive[];
}

export async function countUnlockedArchives(): Promise<number> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from("archives")
    .select("*", { count: "exact", head: true })
    .not("unlocked_at", "is", null)
    .lte("unlocked_at", now);

  if (error) return 0;
  return count ?? 0;
}

export async function getArchiveBySlug(slug: string): Promise<Archive | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("archives")
    .select("*")
    .eq("slug", slug)
    .not("unlocked_at", "is", null)
    .lte("unlocked_at", now)
    .maybeSingle();

  return (data as Archive) ?? null;
}
