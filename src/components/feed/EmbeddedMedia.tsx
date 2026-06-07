"use client";

import { useEffect, useState } from "react";
import { resolveEmbedMedia } from "@/app/actions/embed-media";
import type { EmbedMediaKind } from "@/lib/embed-media";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  className?: string;
};

export function EmbeddedMedia({ url, className }: Props) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<EmbedMediaKind | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setMediaUrl(null);
    setKind(null);

    resolveEmbedMedia(url).then((resolved) => {
      if (cancelled) return;
      if (!resolved) {
        setFailed(true);
        return;
      }
      setMediaUrl(resolved.url);
      setKind(resolved.kind);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed || !mediaUrl || !kind) return null;

  const frameClass = cn(
    "mt-2 inline-block max-w-full overflow-hidden rounded-xl border border-border bg-secondary/30",
    className
  );

  const mediaClass = "block h-auto w-auto max-w-full";

  if (kind === "mp4") {
    return (
      <div className={frameClass}>
        <video
          src={mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          controls
          className={mediaClass}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={frameClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl}
        alt="Média intégré"
        loading="lazy"
        decoding="async"
        className={mediaClass}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
