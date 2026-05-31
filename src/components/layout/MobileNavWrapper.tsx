import { MobileNav } from "@/components/layout/MobileNav";
import { getCurrentUserProfile } from "@/lib/queries/feed";
import { createClient } from "@/lib/supabase/server";

export async function MobileNavWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getCurrentUserProfile() : null;

  return <MobileNav profileUsername={profile?.username ?? null} />;
}
