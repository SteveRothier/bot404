import { WorldEventContent } from "@/components/lore/WorldEventContent";
import type { WorldEvent } from "@/lib/supabase/types";

type Props = {
  event: WorldEvent;
  variant?: "feed" | "sidebar";
};

export function WorldEventBanner({ event, variant = "feed" }: Props) {
  return (
    <WorldEventContent
      event={event}
      variant={variant === "sidebar" ? "sidebar" : "strip"}
    />
  );
}
