"use client";

import { useEffect, useRef } from "react";
import { notifyArchiveUnlockIfNeeded } from "@/app/actions/archives";

const READ_KEY = "bot404-read-archives";

type Props = {
  slug: string;
};

function markRead(slug: string) {
  try {
    const raw = localStorage.getItem(READ_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(slug)) {
      localStorage.setItem(READ_KEY, JSON.stringify([...list, slug]));
    }
  } catch {
    /* ignore */
  }
}

export function ArchiveVisitTracker({ slug }: Props) {
  const notified = useRef(false);

  useEffect(() => {
    markRead(slug);
    if (notified.current) return;
    notified.current = true;
    void notifyArchiveUnlockIfNeeded(slug);
  }, [slug]);

  return null;
}
