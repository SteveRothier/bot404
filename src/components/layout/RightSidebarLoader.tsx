import { RightSidebar } from "@/components/layout/RightSidebar";
import { getCachedShellData } from "@/lib/queries/shell";

export async function RightSidebarLoader() {
  const shell = await getCachedShellData();

  return (
    <RightSidebar
      hashtags={shell.hashtags}
      stats={shell.stats}
      npcSchedule={shell.npcSchedule}
      npcGeneration={shell.npcGeneration}
      ollamaDisplay={shell.ollamaDisplay}
    />
  );
}
