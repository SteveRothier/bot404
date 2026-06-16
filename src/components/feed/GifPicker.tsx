"use client";

import dynamic from "next/dynamic";
import { ComposerPopoverPicker } from "@/components/feed/ComposerPopoverPicker";

const GifPickerPanel = dynamic(() => import("@/components/feed/GifPickerPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-[340px] items-center justify-center text-sm text-muted-foreground">
      Chargement…
    </div>
  ),
});

type Props = {
  onSelect: (gif: { url: string; previewUrl: string }) => void;
  disabled?: boolean;
};

export function GifPicker({ onSelect, disabled }: Props) {
  function pick(
    gif: { url: string; previewUrl: string },
    close: () => void
  ) {
    onSelect(gif);
    close();
  }

  return (
    <ComposerPopoverPicker
      ariaLabel="GIF"
      panelClassName="bot404-gif-picker"
      disabled={disabled}
      trigger={
        <span className="flex size-[18px] items-center justify-center rounded border border-current text-[9px] font-bold leading-none tracking-tight">
          GIF
        </span>
      }
      renderPanel={(close) => (
        <GifPickerPanel onSelect={(gif) => pick(gif, close)} />
      )}
    />
  );
}
