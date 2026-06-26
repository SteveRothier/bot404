import { getRequestAuth } from "@/lib/queries/shell";
import type { Profile } from "@/lib/supabase/types";

export async function getSidebarAuth(): Promise<{
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  profileUsername: string | null;
}> {
  const { user, profile } = await getRequestAuth();

  return {
    user,
    profile,
    profileUsername: profile?.username ?? null,
  };
}
