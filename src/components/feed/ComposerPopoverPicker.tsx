"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 400;

type Props = {
  ariaLabel: string;
  trigger: ReactNode;
  panelClassName: string;
  renderPanel: (close: () => void) => ReactNode;
  disabled?: boolean;
};

export function ComposerPopoverPicker({
  ariaLabel,
  trigger,
  panelClassName,
  renderPanel,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const spacing = 8;
      const margin = 12;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      const left = Math.min(
        Math.max(rect.left, margin),
        viewportW - PANEL_WIDTH - margin
      );

      const spaceBelow = viewportH - rect.bottom - margin;
      const placeAbove = spaceBelow < PANEL_HEIGHT + spacing;

      const top = placeAbove
        ? Math.max(margin, rect.top - PANEL_HEIGHT - spacing)
        : Math.min(rect.bottom + spacing, viewportH - PANEL_HEIGHT - margin);

      setPanelStyle({ top, left, width: PANEL_WIDTH });
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
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {trigger}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Fermer"
            onClick={close}
          />
          <div
            className={cn(
              "fixed z-50 overflow-hidden rounded-lg border border-border bg-secondary shadow-[0_16px_44px_rgba(0,0,0,0.6)]",
              panelClassName
            )}
            style={panelStyle}
          >
            {renderPanel(close)}
          </div>
        </>
      )}
    </div>
  );
}
