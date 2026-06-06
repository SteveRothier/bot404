"use client";

import Image from "next/image";
import { isOptimizableRemoteImage } from "@/lib/images";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
};

/** Images distantes optimisables par Next.js (Supabase Storage, hors GIF). */
export function RemoteImage({
  src,
  alt,
  className,
  width,
  height,
  sizes = "(max-width: 600px) 100vw, 600px",
  fill,
  priority,
}: Props) {
  if (!isOptimizableRemoteImage(src)) {
    return null;
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 600}
      height={height ?? 400}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
