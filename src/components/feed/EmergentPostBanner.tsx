import Link from "next/link";
import { NARRATIVE_COPY } from "@/lib/engine/shared/copy";
import type { EmergentPostContext } from "@/lib/queries/posts/emergent-context";

type Props = {
  context: EmergentPostContext;
};

export function EmergentPostBanner({ context }: Props) {
  return (
    <div className="border-b border-border bg-violet-500/5 px-4 py-2.5 text-sm text-violet-700 dark:text-violet-300">
      <p>{NARRATIVE_COPY.emergentPostContext(context.humanUsername)}</p>
      {context.triggerPostId != null && (
        <Link
          href={`/post/${context.triggerPostId}`}
          className="mt-1 inline-block font-medium text-accent hover:underline"
        >
          {NARRATIVE_COPY.viewYourPostLink}
        </Link>
      )}
    </div>
  );
}
