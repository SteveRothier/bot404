import { attachCommentCountsToPosts } from "@/lib/queries/post-utils";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor, Profile } from "@/lib/supabase/types";

export async function getProfileByUsername(
  username: string
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function getPostsByUsername(
  username: string,
  limit = 30
): Promise<PostWithAuthor[]> {
  const profile = await getProfileByUsername(username);
  if (!profile) return [];

  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*, author:profiles!author_id(*)")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !posts) return [];

  return attachCommentCountsToPosts(supabase, posts);
}
