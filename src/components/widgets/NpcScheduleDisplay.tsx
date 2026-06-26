"use client";

import { useEffect, useMemo, useState } from "react";
import {
  minutesUntilNextNpcRun,
  NPC_COMMENT_INTERVAL_MINUTES,
  NPC_POST_INTERVAL_MINUTES,
} from "@/lib/engine/shared/schedule";
import type { ShellNpcSchedule } from "@/lib/queries/shell";

type Props = {
  npcSchedule: ShellNpcSchedule;
};

type ScheduleItem = {
  key: string;
  label: string;
  intervalMinutes: number;
  lastAt: string | null;
  initialMinutes: number;
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

function computeLiveMinutes(items: ScheduleItem[]): Record<string, number> {
  return Object.fromEntries(
    items.map((item) => [
      item.key,
      minutesUntilNextNpcRun(
        item.lastAt ? new Date(item.lastAt) : null,
        item.intervalMinutes
      ),
    ])
  );
}

export function NpcScheduleDisplay({ npcSchedule }: Props) {
  const scheduleItems = useMemo<ScheduleItem[]>(
    () => [
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
    ],
    [npcSchedule]
  );

  const serverMinutes = useMemo(
    () =>
      Object.fromEntries(
        scheduleItems.map((item) => [item.key, item.initialMinutes])
      ),
    [scheduleItems]
  );

  const [liveMinutes, setLiveMinutes] = useState<Record<string, number> | null>(
    null
  );

  useEffect(() => {
    const update = () => setLiveMinutes(computeLiveMinutes(scheduleItems));
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, [scheduleItems]);

  const minutes = liveMinutes ?? serverMinutes;

  return (
    <>
      {scheduleItems.map((item) => (
        <StatRow
          key={item.key}
          label={item.label}
          value={`${minutes[item.key] ?? item.initialMinutes} min`}
        />
      ))}
    </>
  );
}
