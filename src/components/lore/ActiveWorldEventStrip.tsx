import { WorldEventContent } from "@/components/lore/WorldEventContent";
import type { WorldEvent } from "@/lib/supabase/types";

type Props = {
  event: WorldEvent;
};

export function ActiveWorldEventStrip({ event }: Props) {
  return <WorldEventContent event={event} variant="strip" />;
}
