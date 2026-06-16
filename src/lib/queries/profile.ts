import { fetchEnrichedPosts, POST_WITH_AUTHOR } from "@/lib/queries/post-utils";
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

  return fetchEnrichedPosts(
    supabase,
    { authorId: profileId, limit },
    user?.id
  );
}
