import { createAdminClient } from "@/lib/supabase/admin";
import type { NarrativeArc, NarrativeBeat } from "@/lib/narrative/types";

export async function getActiveScriptedArc(): Promise<NarrativeArc | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("narrative_arcs")
    .select("*")
    .eq("mode", "scripted")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as NarrativeArc | null) ?? null;
}

export async function getActiveEmergentArc(): Promise<NarrativeArc | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("narrative_arcs")
    .select("*")
    .eq("mode", "emergent")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as NarrativeArc | null) ?? null;
}

export async function getNextDueBeat(): Promise<
  (NarrativeBeat & { arc: NarrativeArc }) | null
> {
  const arc = await getActiveScriptedArc();
  if (!arc) return null;

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: beat } = await supabase
    .from("narrative_beats")
    .select("*")
    .eq("arc_id", arc.id)
    .eq("status", "pending")
    .lte("run_at", now)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!beat) return null;
  return { ...(beat as NarrativeBeat), arc };
}

export async function getBeatByArcAndOrder(
  arcId: number,
  sortOrder: number
): Promise<NarrativeBeat | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("narrative_beats")
    .select("*")
    .eq("arc_id", arcId)
    .eq("sort_order", sortOrder)
    .maybeSingle();

  return (data as NarrativeBeat | null) ?? null;
}

export async function getCompletedActOneSynopsis(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("narrative_arcs")
    .select("synopsis, title")
    .eq("slug", "chasse-humains-acte-1")
    .eq("status", "completed")
    .maybeSingle();

  if (!data) return null;
  return `Acte 1 « ${data.title} » terminé. ${data.synopsis}`;
}

export async function isEmergentModeActive(): Promise<boolean> {
  const arc = await getActiveEmergentArc();
  return arc !== null;
}

export type NarrativeUiState = {
  scriptedActive: boolean;
  emergentActive: boolean;
  actOneTitle: string | null;
  pendingSignals: number;
  scriptedProgress: { completed: number; total: number } | null;
  failedBeatsCount: number;
};

async function getScriptedProgress(
  arcId: number
): Promise<{ completed: number; total: number } | null> {
  const supabase = createAdminClient();
  const { data: beats } = await supabase
    .from("narrative_beats")
    .select("status")
    .eq("arc_id", arcId);

  if (!beats?.length) return null;

  const total = beats.length;
  const completed = beats.filter(
    (b) => b.status === "done" || b.status === "skipped"
  ).length;

  return { completed, total };
}

async function getFailedBeatsCount(arcId: number): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("narrative_beats")
    .select("*", { count: "exact", head: true })
    .eq("arc_id", arcId)
    .eq("status", "failed");

  return count ?? 0;
}

export async function getNarrativeStateForUi(): Promise<NarrativeUiState> {
  const supabase = createAdminClient();
  const [scripted, emergent, { count }] = await Promise.all([
    getActiveScriptedArc(),
    getActiveEmergentArc(),
    supabase
      .from("narrative_signals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const [scriptedProgress, failedBeatsCount] =
    scripted !== null
      ? await Promise.all([
          getScriptedProgress(scripted.id),
          getFailedBeatsCount(scripted.id),
        ])
      : [null, 0];

  return {
    scriptedActive: scripted !== null,
    emergentActive: emergent !== null,
    actOneTitle: scripted?.title ?? null,
    pendingSignals: count ?? 0,
    scriptedProgress,
    failedBeatsCount,
  };
}
