import { TrendingList } from "@/components/widgets/TrendingList";
import { EventCard } from "@/components/widgets/EventCard";
import type { TrendingEvent, TrendingHashtag } from "@/lib/supabase/types";

type Props = {
  hashtags: TrendingHashtag[];
  event?: TrendingEvent | null;
};

export function RightSidebar({ hashtags, event }: Props) {
  return (
    <aside className="sidebar-sticky hidden w-80 shrink-0 xl:flex xl:flex-col xl:gap-4">
      <TrendingList hashtags={hashtags} />
      <EventCard event={event} />
    </aside>
  );
}
