"use client";

import { useEffect, useState } from "react";

type Props = {
  endsAt: string;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Terminé";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}j ${hours % 24}h restantes`;
  }
  if (hours > 0) return `${hours}h ${minutes}m restantes`;
  return `${minutes} min restantes`;
}

export function WorldEventCountdown({ endsAt }: Props) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => setLabel(formatRemaining(end - Date.now()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!label) return null;

  return (
    <span className="text-meta text-muted-foreground" aria-live="polite">
      {label}
    </span>
  );
}
