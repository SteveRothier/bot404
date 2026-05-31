"use client";

import { useEffect, useState } from "react";
import { minutesUntilNextNpcRun } from "@/lib/npc-schedule";

type Props = {
  intervalMinutes: number;
  lastAt: string | null;
};

export function NpcNextIn({ intervalMinutes, lastAt }: Props) {
  const lastDate = lastAt ? new Date(lastAt) : null;

  const [minutes, setMinutes] = useState(() =>
    minutesUntilNextNpcRun(lastDate, intervalMinutes)
  );

  useEffect(() => {
    const update = () =>
      setMinutes(minutesUntilNextNpcRun(lastDate, intervalMinutes));

    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, [intervalMinutes, lastAt]);

  return <>{minutes} min</>;
}
