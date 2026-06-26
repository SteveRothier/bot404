import { fetchEnrichedPosts } from "@/lib/queries/posts";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { PostWithAuthor, Profile } from "@/lib/supabase/types";

export async function getProfileByUsername(
  username: string
): Promise<Profile | null> {
  const normalized = decodeURIComponent(username).trim();
  if (!normalized) return null;

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", normalized)
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
