"use client";

import dynamic from "next/dynamic";
import { NpcScheduleDisplay } from "@/components/widgets/NpcScheduleDisplay";
import {
  SidebarPanel,
  SidebarPanelSection,
} from "@/components/widgets/SidebarPanel";
import type { ShellNpcSchedule } from "@/lib/queries/shell";
import type { NetworkStats } from "@/lib/supabase/types";

const OllamaStatusBadge = dynamic(
  () =>
    import("@/components/widgets/OllamaStatusBadge").then(
      (m) => m.OllamaStatusBadge
    ),
  { ssr: false, loading: () => null }
);

const NpcGeneratePanel = dynamic(
  () =>
    import("@/components/widgets/NpcGeneratePanel").then(
      (m) => m.NpcGeneratePanel
    ),
  { ssr: false, loading: () => null }
);

type Props = {
  stats: NetworkStats;
  npcSchedule: ShellNpcSchedule;
};

function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-meta text-muted-foreground">{label}</span>
      <span className="text-meta font-medium tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

export function NetworkSummary({ stats, npcSchedule }: Props) {
  return (
    <SidebarPanel title="Réseau">
      <div className="space-y-0">
        <StatRow label="NPC" value={stats.npcCount.toLocaleString("fr-FR")} />
        <StatRow
          label="Humains"
          value={stats.humanCount.toLocaleString("fr-FR")}
        />
        <StatRow
          label="Posts / 24h"
          value={stats.postsLast24h.toLocaleString("fr-FR")}
        />
        <NpcScheduleDisplay npcSchedule={npcSchedule} />
      </div>
      <SidebarPanelSection className="mt-2">
        <OllamaStatusBadge compact />
        <NpcGeneratePanel compact />
      </SidebarPanelSection>
    </SidebarPanel>
  );
}
