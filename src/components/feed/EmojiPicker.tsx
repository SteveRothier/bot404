"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import "@/components/feed/emoji-picker-overrides.css";
import Picker, {
  Categories,
  EmojiStyle,
  Theme,
  type CategoryIcons,
} from "emoji-picker-react";
import {
  Bus,
  Cat,
  Flag,
  Hamburger,
  History,
  Music,
  Shirt,
  Smile,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICON_CLASS = "size-[18px]";

const lucideCategoryIcons: CategoryIcons = {
  [Categories.SUGGESTED]: (
    <History className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
  [Categories.SMILEYS_PEOPLE]: (
    <Smile className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
  [Categories.ANIMALS_NATURE]: (
    <Cat className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
  [Categories.FOOD_DRINK]: (
    <Hamburger className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
  [Categories.TRAVEL_PLACES]: (
    <Bus className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
  [Categories.ACTIVITIES]: (
    <Trophy className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
  [Categories.OBJECTS]: (
    <Shirt className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
  [Categories.SYMBOLS]: (
    <Music className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
  [Categories.FLAGS]: (
    <Flag className={CATEGORY_ICON_CLASS} strokeWidth={1.75} />
  ),
};

type Props = {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
};

export function EmojiPicker({ onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const styleId = "bot404-emoji-picker-runtime-overrides";
    const overrideCss = `
      #epr-category-nav-id {
        display: flex !important;
        width: 100% !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 0 6px !important;
        margin: 0 !important;
        box-sizing: border-box !important;
      }
      .bot404-emoji-picker .epr-search-container {
        padding-bottom: 0 !important;
        position: relative !important;
      }
      .bot404-emoji-picker .epr-icn-search {
        left: 12px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        background-position: 0 -20px !important;
      }
      .bot404-emoji-picker .epr-btn-clear-search {
        right: 8px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 28px !important;
        height: 28px !important;
      }
      .bot404-emoji-picker .epr-icn-clear-search {
        background-position: 0 -40px !important;
      }
      .bot404-emoji-picker .epr-body {
        padding-top: 0 !important;
      }
      #epr-category-nav-id .epr-cat-btn {
        flex: 0 0 auto !important;
        width: 26px !important;
        height: 26px !important;
        min-width: 26px !important;
        max-width: 26px !important;
      }
    `;

    function mountOverrides() {
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
      }
      style.textContent = overrideCss;
      document.head.appendChild(style);
    }

    mountOverrides();
    const t1 = window.setTimeout(mountOverrides, 0);
    const t2 = window.setTimeout(mountOverrides, 100);

    function updatePosition() {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 340;
      const panelHeight = 400;
      const spacing = 8;
      const margin = 12;

      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      const left = Math.min(
        Math.max(rect.left, margin),
        viewportW - panelWidth - margin
      );

      const spaceBelow = viewportH - rect.bottom - margin;
      const placeAbove = spaceBelow < panelHeight + spacing;

      const top = placeAbove
        ? Math.max(margin, rect.top - panelHeight - spacing)
        : Math.min(rect.bottom + spacing, viewportH - panelHeight - margin);

      setPanelStyle({ top, left, width: panelWidth });
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", handleEscape);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      document.getElementById(styleId)?.remove();
    };
  }, [open]);

  function pick(emoji: string) {
    onSelect(emoji);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label="Emoji"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <Smile className="size-[18px]" strokeWidth={1.75} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div
            className="bot404-emoji-picker fixed z-50 overflow-hidden rounded-lg border border-border bg-secondary shadow-[0_16px_44px_rgba(0,0,0,0.6)]"
            style={panelStyle}
          >
            <Picker
              theme={Theme.DARK}
              emojiStyle={EmojiStyle.NATIVE}
              categoryIcons={lucideCategoryIcons}
              lazyLoadEmojis
              autoFocusSearch={false}
              searchDisabled={false}
              skinTonesDisabled
              width={340}
              height={400}
              searchPlaceHolder="Chercher un emoji"
              previewConfig={{ showPreview: true }}
              onEmojiClick={(emojiData) => pick(emojiData.emoji)}
              style={
                {
                  "--epr-bg-color": "#120c14",
                  "--epr-hover-bg-color": "#1e1220",
                  "--epr-search-border-color": "#f43f5e",
                  "--epr-search-input-bg-color": "#0b070d",
                  "--epr-highlight-color": "#f43f5e",
                  "--epr-category-icon-active-color": "#f43f5e",
                  "--epr-header-padding": "4px 6px 0",
                  "--epr-category-navigation-button-size": "26px",
                  "--epr-search-bar-inner-padding": "8px",
                  "--epr-search-input-padding": "8px 34px 8px 38px",
                  "--epr-search-input-height": "36px",
                  "--epr-horizontal-padding": "8px",
                  "--epr-category-padding": "6px 8px",
                  "--epr-hover-bg-color": "#1e1220",
                  "--epr-focus-bg-color": "transparent",
                  "--epr-emoji-hover-color": "#1e1220",
                  "--epr-category-label-bg-color": "#120c14",
                  "--epr-text-color": "#f0e8ec",
                  "--epr-border-radius": "8px",
                  "--epr-preview-height": "54px",
                  "--epr-emoji-size": "24px",
                  "--epr-emoji-padding": "7px",
                } as CSSProperties
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
