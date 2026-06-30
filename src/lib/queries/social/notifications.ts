import { createClient } from "@/lib/supabase/server";
import { VISIBLE_NOTIFICATION_KINDS } from "@/lib/notifications";
import type { NotificationWithActor } from "@/lib/supabase/types";

export async function getNotifications(
  limit = 30
): Promise<NotificationWithActor[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey (
        id, username, avatar_url, is_npc
      )
    `
    )
    .eq("user_id", user.id)
    .in("kind", VISIBLE_NOTIFICATION_KINDS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as NotificationWithActor[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("kind", VISIBLE_NOTIFICATION_KINDS)
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}
