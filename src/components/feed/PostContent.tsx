import Link from "next/link";
import { EmbeddedMedia } from "@/components/feed/EmbeddedMedia";
import { hashtagTagHref } from "@/lib/hashtags";
import {
  embedUrlDuplicatesMedia,
  extractEmbedMediaUrls,
  shouldHideEmbedUrl,
  stripEmbedUrlsForDisplay,
} from "@/lib/embed-media";
import {
  isHashtagToken,
  isMentionToken,
  isUrlToken,
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
  mediaUrl?: string | null;
};

export function PostContent({ content, postType, className, mediaUrl }: Props) {
  const embedSourceUrl = extractEmbedMediaUrls(content)[0];
  const displayContent = stripEmbedUrlsForDisplay(content);
  const parts = splitContentTokens(displayContent);
  const isSignal = postType === "signal";
  const showEmbed =
    embedSourceUrl &&
    !embedUrlDuplicatesMedia(embedSourceUrl, mediaUrl ?? null);

  if (!displayContent && showEmbed) {
    return <EmbeddedMedia url={embedSourceUrl} />;
  }

  return (
    <>
      {(displayContent || isSignal) && (
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
            if (
              isUrlToken(part) &&
              !shouldHideEmbedUrl(part, embedSourceUrl)
            ) {
              return (
                <a
                  key={`${part}-${i}`}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {part}
                </a>
              );
            }
            if (isUrlToken(part)) {
              return null;
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      )}
      {showEmbed && <EmbeddedMedia url={embedSourceUrl} />}
    </>
  );
}
