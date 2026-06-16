import { FactionsHydrator } from "@/components/providers/FactionsHydrator";
import { getCachedShellData } from "@/lib/queries/cached";

export async function FactionsHydratorLoader() {
  const shell = await getCachedShellData();
  return <FactionsHydrator factions={shell.factions} />;
}
