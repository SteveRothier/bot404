import {
  minutesUntilNextNpcRun,
  NPC_COMMENT_INTERVAL_MINUTES,
  NPC_POST_INTERVAL_MINUTES,
} from "@/lib/engine/shared/schedule";
import {
  getCachedNetworkStatsData,
  getCachedPopularHashtagsData,
} from "@/lib/queries/shell/data-cache";
import {
  getLastNpcCommentTime,
  getLastNpcPostTime,
} from "@/lib/queries/shell/npc-schedule";

export type ShellNpcSchedule = {
  lastPostAt: string | null;
  lastCommentAt: string | null;
  nextPostMinutes: number;
  nextCommentMinutes: number;
};

export async function getShellData() {
  const [stats, hashtags, lastPostAt, lastCommentAt] = await Promise.all([
    getCachedNetworkStatsData(),
    getCachedPopularHashtagsData(10),
    getLastNpcPostTime(),
    getLastNpcCommentTime(),
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

  return {
    stats,
    hashtags: hashtags.slice(0, 5),
    npcSchedule,
  };
}
