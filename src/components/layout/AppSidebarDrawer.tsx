"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Menu, X } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NavDrawerProvider } from "@/components/layout/NavDrawerContext";

type Props = {
  children: React.ReactNode;
  showNotifications?: boolean;
};

export function AppSidebarDrawer({
  children,
  showNotifications = false,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-accent" strokeWidth={1.75} />
          <span className="text-lg font-bold text-foreground">Bot404</span>
        </Link>
        <div className="flex items-center gap-1">
          {showNotifications && <NotificationBell />}
          <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full p-2 text-foreground transition-colors hover:bg-secondary"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
        >
          <Menu className="size-6" strokeWidth={1.75} />
        </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fermer le menu"
            onClick={close}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,280px)] flex-col bg-background shadow-xl">
            <div className="flex items-center justify-end border-b border-border px-2 py-2">
              <button
                type="button"
                onClick={close}
                className="rounded-full p-2 text-foreground transition-colors hover:bg-secondary"
                aria-label="Fermer le menu"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-6">
              <NavDrawerProvider onClose={close}>{children}</NavDrawerProvider>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
