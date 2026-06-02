"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, X } from "lucide-react";
import type { Archive as ArchiveRecord } from "@/lib/supabase/types";

const DISMISS_KEY = "bot404-dismissed-archives";

type Props = {
  archive: ArchiveRecord;
};

function isDismissed(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(slug);
  } catch {
    return false;
  }
}

function dismiss(slug: string) {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(slug)) {
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...list, slug]));
    }
  } catch {
    /* ignore */
  }
}

export function ArchiveUnlockBanner({ archive }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isDismissed(archive.slug));
  }, [archive.slug]);

  if (!visible) return null;

  function handleDismiss() {
    dismiss(archive.slug);
    setVisible(false);
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <Archive
          className="mt-0.5 size-4 shrink-0 text-amber-500"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-meta font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Archive débloquée
          </p>
          <p className="mt-0.5 text-[15px] font-bold text-foreground">
            {archive.title}
          </p>
          <Link
            href={`/archives/${archive.slug}`}
            className="mt-1 inline-block text-sm text-accent hover:underline"
          >
            Consulter l&apos;archive →
          </Link>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Masquer"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
