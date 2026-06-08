import { attachCommentCountsToPosts, POST_WITH_AUTHOR } from "@/lib/queries/post-utils";
import { createClient } from "@/lib/supabase/server";
import type { PostWithAuthor, Profile } from "@/lib/supabase/types";

export async function getProfileByUsername(
  username: string
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, faction:factions(*)")
    .eq("username", username)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function getPostsByProfileId(
  profileId: string,
  limit = 30
): Promise<PostWithAuthor[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts, error } = await supabase
    .from("posts")
    .select(POST_WITH_AUTHOR)
    .eq("author_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !posts) return [];

  return attachCommentCountsToPosts(supabase, posts, user?.id);
}
