"use client";

import Link from "next/link";
import {
  HASHTAG_REGEX,
  HASHTAG_TOKEN_REGEX,
  hashtagSearchHref,
} from "@/lib/hashtags";

type Props = {
  content: string;
  className?: string;
};

export function PostContent({ content, className }: Props) {
  const parts = content.split(HASHTAG_REGEX);

  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (HASHTAG_TOKEN_REGEX.test(part)) {
          return (
            <Link
              key={`${part}-${i}`}
              href={hashtagSearchHref(part)}
              className="text-[#fb7185] hover:underline"
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
