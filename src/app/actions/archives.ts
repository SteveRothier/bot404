"use server";

import { createArchiveUnlockNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export async function notifyArchiveUnlockIfNeeded(archiveSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const };

  await createArchiveUnlockNotification(user.id, archiveSlug);
  return { ok: true as const };
}
