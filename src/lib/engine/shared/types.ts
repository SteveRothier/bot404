import type { PostType } from "@/lib/supabase/types";

export type NarrativeArcMode = "scripted" | "emergent";
export type NarrativeArcStatus = "draft" | "active" | "completed" | "paused";

export type NarrativeBeatKind =
  | "npc_post"
  | "npc_comment"
  | "world_event"
  | "pause"
  | "arc_complete";

export type NarrativeBeatStatus = "pending" | "done" | "skipped" | "failed";

export type NarrativeSignalKind =
  | "human_post"
  | "human_comment"
  | "human_joined"
  | "reaction"
  | "mention";

export type NarrativeSignalStatus = "pending" | "handled" | "expired" | "failed";

export type NarrativeArc = {
  id: number;
  slug: string;
  title: string;
  synopsis: string;
  mode: NarrativeArcMode;
  status: NarrativeArcStatus;
  baseline_event_slug: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type NarrativeBeat = {
  id: number;
  arc_id: number;
  sort_order: number;
  kind: NarrativeBeatKind;
  run_at: string;
  status: NarrativeBeatStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
};

export type NarrativeSignal = {
  id: number;
  kind: NarrativeSignalKind;
  author_id: string;
  post_id: number | null;
  comment_id: number | null;
  reaction_kind: string | null;
  mentioned_username: string | null;
  priority: number;
  status: NarrativeSignalStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
  handled_at: string | null;
};

export type NpcPostBeatPayload = {
  npc_username: string;
  post_type?: PostType;
  directive?: string;
  hashtags?: string[];
};

export type NpcCommentBeatPayload = {
  npc_username: string;
  reply_to_beat_id?: number;
  reply_to_beat_order?: number;
  directive?: string;
};

export type NarrativeTickResult = {
  handled: boolean;
  mode: "emergent" | "ambient" | "none";
  detail?: Record<string, unknown>;
};
