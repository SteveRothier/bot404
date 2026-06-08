"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { dicebearAvatarUrl, resolveAvatarUrl } from "@/lib/avatars";
import { cn } from "@/lib/utils";

type Props = {
  avatarUrl?: string | null;
  fallbackSeed: string;
  username: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  alt?: string;
  /** Si false, ne remplace pas une URL custom par Dicebear en cas d'échec. */
  allowDicebearFallback?: boolean;
  onImageError?: () => void;
  onImageLoad?: () => void;
};

export function UserAvatar({
  avatarUrl,
  fallbackSeed,
  username,
  className,
  imageClassName,
  fallbackClassName,
  alt,
  allowDicebearFallback = true,
  onImageError,
  onImageLoad,
}: Props) {
  const dicebearFallback = dicebearAvatarUrl(fallbackSeed);
  const [src, setSrc] = useState(() =>
    resolveAvatarUrl(avatarUrl, fallbackSeed)
  );

  useEffect(() => {
    setSrc(resolveAvatarUrl(avatarUrl, fallbackSeed));
  }, [avatarUrl, fallbackSeed]);

  const handleLoadingStatusChange = useCallback(
    (status: "idle" | "loading" | "loaded" | "error") => {
      if (status === "loaded") {
        onImageLoad?.();
        return;
      }
      if (status === "error") {
        onImageError?.();
        if (allowDicebearFallback && src !== dicebearFallback) {
          setSrc(dicebearFallback);
        }
      }
    },
    [allowDicebearFallback, dicebearFallback, onImageError, onImageLoad, src]
  );

  const initials = username.slice(0, 2) || "??";

  return (
    <Avatar className={className}>
      <AvatarImage
        src={src}
        alt={alt ?? username}
        className={imageClassName}
        referrerPolicy="no-referrer"
        onLoadingStatusChange={handleLoadingStatusChange}
      />
      <AvatarFallback
        className={cn(
          "bg-secondary text-xs text-muted-foreground",
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
