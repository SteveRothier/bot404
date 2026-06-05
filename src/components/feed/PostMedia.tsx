import { RemoteImage } from "@/components/ui/remote-image";
import { isGifUrl } from "@/lib/images";
import type { PostMediaType } from "@/lib/supabase/types";

type Props = {
  url: string;
  mediaType: PostMediaType | null;
};

export function PostMedia({ url, mediaType }: Props) {
  const isGif = mediaType === "gif" || isGifUrl(url);

  if (isGif) {
    return (
      <div className="mt-2 overflow-hidden rounded-xl border border-border bg-secondary/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Média du post"
          loading="lazy"
          decoding="async"
          className="mx-auto block h-auto max-h-[32rem] w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border bg-secondary/30">
      <RemoteImage
        src={url}
        alt="Média du post"
        width={600}
        height={400}
        sizes="(max-width: 600px) 100vw, 600px"
        className="mx-auto block h-auto max-h-96 w-full object-contain"
      />
    </div>
  );
}
