import { RightSidebar } from "@/components/layout/RightSidebar";
import { FactionsHydrator } from "@/components/providers/FactionsHydrator";
import { getCachedShellData } from "@/lib/queries/cached";

export async function RightSidebarLoader() {
  const shell = await getCachedShellData();

  return (
    <>
      <FactionsHydrator factions={shell.factions} />
      <RightSidebar
        hashtags={shell.hashtags}
        stats={shell.stats}
        npcSchedule={shell.npcSchedule}
        loreAlerts={shell.loreAlerts}
      />
    </>
  );
}
