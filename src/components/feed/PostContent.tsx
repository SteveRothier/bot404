import Link from "next/link";
import { hashtagTagHref } from "@/lib/hashtags";
import {
  isHashtagToken,
  isMentionToken,
  mentionUsernameFromToken,
  splitContentTokens,
} from "@/lib/content-parse";
import { mentionProfileHref } from "@/lib/mentions";
import { cn } from "@/lib/utils";
import type { PostType } from "@/lib/supabase/types";

type Props = {
  content: string;
  postType?: PostType;
  className?: string;
};

export function PostContent({ content, postType, className }: Props) {
  const parts = splitContentTokens(content);
  const isSignal = postType === "signal";

  return (
    <p
      className={cn(
        className,
        isSignal && "font-mono text-[14px] tracking-tight"
      )}
    >
      {isSignal && (
        <span className="mr-2 text-meta text-accent">[SIGNAL]</span>
      )}
      {parts.map((part, i) => {
        if (isHashtagToken(part)) {
          return (
            <Link
              key={`${part}-${i}`}
              href={hashtagTagHref(part)}
              className="text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        if (isMentionToken(part)) {
          const username = mentionUsernameFromToken(part);
          return (
            <Link
              key={`${part}-${i}`}
              href={mentionProfileHref(username)}
              className="text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
