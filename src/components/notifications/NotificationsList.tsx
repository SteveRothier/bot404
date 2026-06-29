"use client";

import Link from "next/link";
import { useTransition } from "react";
import { formatRelativeTimeShort } from "@/lib/format";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { NotificationKind, NotificationWithActor } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/stores/notifications-store";

type Props = {
  notifications: NotificationWithActor[];
  referenceNowMs: number;
};

function notificationMessage(
  n: NotificationWithActor
): { text: string; href: string } {
  const actor = n.actor?.username ?? "Quelqu'un";

  switch (n.kind as NotificationKind) {
    case "mention":
      return {
        text: `${actor} vous a mentionné`,
        href: n.post_id ? `/post/${n.post_id}` : "/",
      };
    case "reaction":
      return {
        text: `${actor} a aimé votre post`,
        href: n.post_id ? `/post/${n.post_id}` : "/",
      };
    case "comment_reaction":
      return {
        text: `${actor} a aimé votre commentaire`,
        href: n.post_id ? `/post/${n.post_id}` : "/",
      };
    case "comment_reply":
      return {
        text: `${actor} a répondu à votre commentaire`,
        href: n.post_id ? `/post/${n.post_id}` : "/",
      };
    case "follow":
      return {
        text: `${actor} vous suit`,
        href: n.actor ? `/profile/${n.actor.username}` : "/",
      };
    default:
      return { text: "Nouvelle notification", href: "/" };
  }
}

export function NotificationsList({ notifications, referenceNowMs }: Props) {
  const [pending, startTransition] = useTransition();

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.success) {
        useNotificationsStore.getState().setUnreadCount(0);
      }
    });
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.success) {
        const current = useNotificationsStore.getState().unreadCount;
        useNotificationsStore
          .getState()
          .setUnreadCount(Math.max(0, current - 1));
      }
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted-foreground">
          Aucune notification pour l&apos;instant.
        </p>
        <Link
          href="/trending"
          className="mt-3 inline-block text-[15px] text-accent hover:underline"
        >
          Explorer le réseau
        </Link>
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div>
      {hasUnread && (
        <div className="border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={pending}
            className="text-sm text-accent hover:underline disabled:opacity-50"
          >
            Tout marquer comme lu
          </button>
        </div>
      )}

      <ul className="divide-y divide-border">
        {notifications.map((n) => {
          const { text, href } = notificationMessage(n);
          const unread = !n.read_at;

          return (
            <li key={n.id}>
              <Link
                href={href}
                onClick={() => unread && handleMarkOne(n.id)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/50",
                  unread && "bg-accent/5"
                )}
              >
                <UserAvatar
                  avatarUrl={n.actor?.avatar_url}
                  fallbackSeed={n.actor?.id ?? "system"}
                  username={n.actor?.username ?? "??"}
                  className="size-10 shrink-0 rounded-lg"
                  imageClassName="rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-foreground">{text}</p>
                  <p className="mt-0.5 text-meta text-muted-foreground">
                    {formatRelativeTimeShort(n.created_at, referenceNowMs)}
                  </p>
                </div>
                {unread && (
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-accent"
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
