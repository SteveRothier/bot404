"use client";

import { useEffect, useState } from "react";
import {
  minutesUntilNextNpcRun,
  NPC_COMMENT_INTERVAL_MINUTES,
  NPC_POST_INTERVAL_MINUTES,
} from "@/lib/npc-schedule";
import type { ShellNpcSchedule } from "@/lib/queries/shell-data";

type Props = {
  npcSchedule: ShellNpcSchedule;
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-meta text-muted-foreground">{label}</span>
      <span className="text-meta font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export function NpcScheduleDisplay({ npcSchedule }: Props) {
  const items = [
    {
      key: "post",
      label: "Post NPC",
      intervalMinutes: NPC_POST_INTERVAL_MINUTES,
      lastAt: npcSchedule.lastPostAt,
      initialMinutes: npcSchedule.nextPostMinutes,
    },
    {
      key: "comment",
      label: "Com. NPC",
      intervalMinutes: NPC_COMMENT_INTERVAL_MINUTES,
      lastAt: npcSchedule.lastCommentAt,
      initialMinutes: npcSchedule.nextCommentMinutes,
    },
  ];

  const [minutes, setMinutes] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.key, item.initialMinutes]))
  );

  useEffect(() => {
    setMinutes(
      Object.fromEntries(items.map((item) => [item.key, item.initialMinutes]))
    );
  }, [npcSchedule]);

  useEffect(() => {
    const update = () => {
      setMinutes(
        Object.fromEntries(
          items.map((item) => [
            item.key,
            minutesUntilNextNpcRun(
              item.lastAt ? new Date(item.lastAt) : null,
              item.intervalMinutes
            ),
          ])
        )
      );
    };

    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, [npcSchedule]);

  return (
    <>
      {items.map((item) => (
        <StatRow
          key={item.key}
          label={item.label}
          value={`${minutes[item.key] ?? item.initialMinutes} min`}
        />
      ))}
    </>
  );
}
