import { createAdminClient } from "@/lib/supabase/admin";
import type { NarrativeArc } from "@/lib/engine/shared/types";

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

export async function getEmergentArcSynopsis(): Promise<string> {
  const arc = await getActiveEmergentArc();
  return arc?.synopsis ?? "Le réseau réagit aux traces humaines.";
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
  if (arc !== null) return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

export type NarrativeUiState = {
  emergentActive: boolean;
  pendingSignals: number;
};

export async function getNarrativeStateForUi(): Promise<NarrativeUiState> {
  const supabase = createAdminClient();
  const [emergent, { count }] = await Promise.all([
    getActiveEmergentArc(),
    supabase
      .from("narrative_signals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    emergentActive: emergent !== null,
    pendingSignals: count ?? 0,
  };
}
