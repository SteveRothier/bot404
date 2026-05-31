import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HashtagList } from "@/components/widgets/HashtagList";
import type { TrendingHashtag } from "@/lib/supabase/types";

type Props = {
  hashtags: TrendingHashtag[];
  title?: string;
};

export function TrendingList({
  hashtags,
  title = "Tendances du réseau",
}: Props) {
  return (
    <Card className="border-[#2b1117] bg-[#0b0a13] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">
            <TrendingUp className="size-3.5 text-[#fb7185]" strokeWidth={2} />
            {title}
          </CardTitle>
          {hashtags.length > 0 && (
            <Link
              href="/trending"
              className="text-[10px] font-medium uppercase tracking-wide text-[#6b7280] hover:text-[#fb7185]"
            >
              Explorer
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <HashtagList hashtags={hashtags} limit={5} />
      </CardContent>
    </Card>
  );
}
