import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type NotificationsState = {
  unreadCount: number;
  hydrated: boolean;
  hydrate: (count: number) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,
  hydrated: false,
  hydrate: (count) => set({ unreadCount: count, hydrated: true }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () =>
    set((s) => ({ unreadCount: s.unreadCount + 1 })),
}));

let realtimeChannel: RealtimeChannel | null = null;
let realtimeUserId: string | null = null;

async function refreshUnreadCount(userId: string) {
  const supabase = createClient();
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  useNotificationsStore.getState().setUnreadCount(count ?? 0);
}

export function startNotificationsRealtime(userId: string) {
  if (realtimeStartedFor(userId)) return;
  stopNotificationsRealtime();

  realtimeUserId = userId;
  const supabase = createClient();
  realtimeChannel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        useNotificationsStore.getState().incrementUnread();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refreshUnreadCount(userId);
      }
    )
    .subscribe();
}

function realtimeStartedFor(userId: string) {
  return realtimeUserId === userId && realtimeChannel !== null;
}

export function stopNotificationsRealtime() {
  if (!realtimeChannel) return;
  const supabase = createClient();
  supabase.removeChannel(realtimeChannel);
  realtimeChannel = null;
  realtimeUserId = null;
}
