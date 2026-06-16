"use client";

import dynamic from "next/dynamic";
import { Smile } from "lucide-react";
import { ComposerPopoverPicker } from "@/components/feed/ComposerPopoverPicker";

const EmojiPickerPanel = dynamic(() => import("@/components/feed/EmojiPickerPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-[340px] items-center justify-center text-sm text-muted-foreground">
      Chargement…
    </div>
  ),
});

type Props = {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
};

export function EmojiPicker({ onSelect, disabled }: Props) {
  function pick(emoji: string, close: () => void) {
    onSelect(emoji);
    close();
  }

  return (
    <ComposerPopoverPicker
      ariaLabel="Emoji"
      panelClassName="bot404-emoji-picker"
      disabled={disabled}
      trigger={<Smile className="size-[18px]" strokeWidth={1.75} />}
      renderPanel={(close) => (
        <EmojiPickerPanel onSelect={(emoji) => pick(emoji, close)} />
      )}
    />
  );
}
