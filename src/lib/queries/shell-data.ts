import {
  minutesUntilNextNpcRun,
  NPC_COMMENT_INTERVAL_MINUTES,
  NPC_POST_INTERVAL_MINUTES,
} from "@/lib/npc-schedule";
import {
  getCachedActiveWorldEventsData,
  getCachedFactionsData,
  getCachedNetworkStatsData,
  getCachedPopularHashtagsData,
} from "@/lib/queries/data-cache";
import {
  getLastNpcCommentTime,
  getLastNpcPostTime,
} from "@/lib/queries/npc-schedule";
import type { WorldEvent } from "@/lib/supabase/types";

export type ShellLoreAlerts = {
  activeWorldEvent: WorldEvent | null;
};

export type ShellNpcSchedule = {
  lastPostAt: string | null;
  lastCommentAt: string | null;
  nextPostMinutes: number;
  nextCommentMinutes: number;
};

export async function getShellData() {
  const [
    stats,
    hashtags,
    factions,
    lastPostAt,
    lastCommentAt,
    activeEvents,
  ] = await Promise.all([
    getCachedNetworkStatsData(),
    getCachedPopularHashtagsData(10),
    getCachedFactionsData(),
    getLastNpcPostTime(),
    getLastNpcCommentTime(),
    getCachedActiveWorldEventsData(),
  ]);

  const npcSchedule: ShellNpcSchedule = {
    lastPostAt: lastPostAt?.toISOString() ?? null,
    lastCommentAt: lastCommentAt?.toISOString() ?? null,
    nextPostMinutes: minutesUntilNextNpcRun(
      lastPostAt,
      NPC_POST_INTERVAL_MINUTES
    ),
    nextCommentMinutes: minutesUntilNextNpcRun(
      lastCommentAt,
      NPC_COMMENT_INTERVAL_MINUTES
    ),
  };

  const loreAlerts: ShellLoreAlerts = {
    activeWorldEvent: activeEvents[0] ?? null,
  };

  return {
    stats,
    hashtags: hashtags.slice(0, 5),
    factions,
    npcSchedule,
    loreAlerts,
  };
}
