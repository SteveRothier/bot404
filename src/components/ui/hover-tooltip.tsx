"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 400;

type Props = {
  label: string;
  children: ReactNode;
  side?: "top" | "right";
  disabled?: boolean;
  className?: string;
};

/** Bulle sombre style X/Twitter au survol uniquement (portail body). */
export function HoverTooltip({
  label,
  children,
  side = "top",
  disabled = false,
  className,
}: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCapableRef = useRef(true);
  const tooltipId = useId();
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    hoverCapableRef.current = window.matchMedia("(hover: hover)").matches;
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
    };
  }, []);

  const updateCoords = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (side === "right") {
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 6,
      });
    } else {
      setCoords({
        top: rect.top - 6,
        left: rect.left + rect.width / 2,
      });
    }
  }, [side]);

  function reveal() {
    if (disabled || !label || !hoverCapableRef.current) return;
    updateCoords();
    if (delayRef.current) clearTimeout(delayRef.current);
    delayRef.current = setTimeout(() => setShow(true), SHOW_DELAY_MS);
  }

  function dismiss() {
    if (delayRef.current) clearTimeout(delayRef.current);
    setShow(false);
  }

  useEffect(() => {
    if (!show) return;

    const onScrollOrResize = () => updateCoords();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [show, updateCoords]);

  const tooltipTransform =
    side === "right" ? "translateY(-50%)" : "translate(-50%, -100%)";

  const tooltip =
    mounted && show && label
      ? createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[300] whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-[0_0_8px_rgba(0,0,0,0.6)]"
            style={{
              top: coords.top,
              left: coords.left,
              transform: tooltipTransform,
            }}
          >
            {label}
          </span>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={anchorRef}
        className={cn("inline-flex items-center", className)}
        onMouseEnter={reveal}
        onMouseLeave={dismiss}
        aria-describedby={show ? tooltipId : undefined}
      >
        {children}
      </span>
      {tooltip}
    </>
  );
}
