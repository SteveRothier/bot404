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

type Props = {
  content: string;
  className?: string;
  mediaUrl?: string | null;
};

export function PostContent({ content, className, mediaUrl }: Props) {
  const embedSourceUrl = extractEmbedMediaUrls(content)[0];
  const displayContent = stripEmbedUrlsForDisplay(content);
  const parts = splitContentTokens(displayContent);
  const showEmbed =
    embedSourceUrl &&
    !embedUrlDuplicatesMedia(embedSourceUrl, mediaUrl ?? null);

  if (!displayContent && showEmbed) {
    return <EmbeddedMedia url={embedSourceUrl} />;
  }

  return (
    <>
      {displayContent && (
        <p className={cn(className)}>
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
