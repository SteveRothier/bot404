import type { NarrativeInteractionRow } from "@/lib/queries/narrative-ui";

export function mergeNarrativeInteractions(
  rows: NarrativeInteractionRow[],
  limit: number
): NarrativeInteractionRow[] {
  return [...rows]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}
