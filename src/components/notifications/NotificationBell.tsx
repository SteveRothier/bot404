"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/stores/notifications-store";

type Props = {
  className?: string;
};

export function NotificationBell({ className }: Props) {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const showBadge = unreadCount > 0;

  return (
    <Link
      href="/notifications"
      className={cn(
        "relative rounded-full p-2 text-foreground transition-colors hover:bg-secondary",
        className
      )}
      aria-label={
        showBadge
          ? `Notifications (${unreadCount} non lues)`
          : "Notifications"
      }
    >
      <Bell className="size-5" strokeWidth={1.75} />
      {showBadge && (
        <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
