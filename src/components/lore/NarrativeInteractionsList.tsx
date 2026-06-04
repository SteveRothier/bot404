import Link from "next/link";
import { NARRATIVE_COPY } from "@/lib/narrative/copy";
import type { NarrativeInteractionRow } from "@/lib/queries/narrative-ui";

type Props = {
  interactions: NarrativeInteractionRow[];
};

export function NarrativeInteractionsList({ interactions }: Props) {
  if (interactions.length === 0) return null;

  return (
    <ul className="space-y-2">
      {interactions.map((row) => {
        const showTriggerLink =
          row.trigger_post_id != null &&
          row.trigger_post_id !== row.link_post_id;

        return (
          <li
            key={`${row.kind}-${row.id}`}
            className="rounded-lg border border-border px-3 py-2"
          >
            <p className="text-meta text-muted-foreground">
              @{row.npc_username}
              {row.human_username ? ` → @${row.human_username}` : ""}
              <span className="text-muted-foreground/70">
                {" "}
                · {NARRATIVE_COPY.interactionKind[row.kind]}
              </span>
            </p>
            <p className="mt-0.5 line-clamp-3 text-[15px]">{row.content}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link
                href={`/post/${row.link_post_id}`}
                className="text-sm text-accent hover:underline"
              >
                {row.kind === "post"
                  ? NARRATIVE_COPY.viewPostLink
                  : NARRATIVE_COPY.viewThreadLink}
              </Link>
              {showTriggerLink && (
                <Link
                  href={`/post/${row.trigger_post_id}`}
                  className="text-sm text-accent hover:underline"
                >
                  {NARRATIVE_COPY.viewYourPostLink}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
