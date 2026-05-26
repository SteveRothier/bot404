import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUserProfile } from "@/lib/queries/feed";
import { createClient } from "@/lib/supabase/server";

export async function TopBarWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getCurrentUserProfile() : null;

  return <TopBar user={user} profile={profile} />;
}
