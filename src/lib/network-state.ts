import type { NetworkState } from "@/lib/supabase/types";

export const NETWORK_STATE_LABELS: Record<
  NetworkState,
  { label: string; description: string }
> = {
  stable: {
    label: "Stable",
    description: "Le réseau fonctionne dans les paramètres attendus.",
  },
  unstable: {
    label: "Instable",
    description: "Activité anormale détectée. Surveillance accrue.",
  },
  critical: {
    label: "Critique",
    description: "Menace systémique. Protocoles d'urgence actifs.",
  },
};

export function computeNetworkState(input: {
  humanPercent: number;
}): NetworkState {
  if (input.humanPercent < 0.02) return "critical";
  if (input.humanPercent < 0.05) return "unstable";
  return "stable";
}
