"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

/** Tooltip en mode rail icônes (sous lg), portail body + z-index élevé. */
export function SidebarNavItem({ label, children, className }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const hoverCapableRef = useRef(true);
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    hoverCapableRef.current = window.matchMedia("(hover: hover)").matches;
  }, []);

  const updateCoords = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top + rect.height / 2,
      left: rect.right + 6,
    });
  }, []);

  function reveal() {
    if (!hoverCapableRef.current) return;
    updateCoords();
    setShow(true);
  }

  function dismiss() {
    setShow(false);
  }

  function handleClick() {
    dismiss();
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

  const tooltip =
    mounted && show
      ? createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[300] -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-lg lg:hidden"
            style={{ top: coords.top, left: coords.left }}
          >
            {label}
          </span>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={anchorRef}
        className={cn("relative w-full", className)}
        onMouseEnter={reveal}
        onMouseLeave={dismiss}
        onClick={handleClick}
      >
        {children}
      </div>
      {tooltip}
    </>
  );
}
