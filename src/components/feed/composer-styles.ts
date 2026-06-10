import { cn } from "@/lib/utils";

export const composerTextareaClassName =
  "min-h-[52px] resize-none rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-[17px] leading-6 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent dark:disabled:bg-transparent disabled:bg-transparent disabled:opacity-50";

export const composerTextareaGuestClassName =
  "min-h-[52px] resize-none rounded-none border-0 bg-transparent px-1 pb-3 pt-2 text-[17px] leading-6 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0";

export function composerSubmitClassName(active: boolean) {
  return cn(
    "h-9 shrink-0 rounded-full px-5 text-[15px] font-bold transition-colors",
    active
      ? "bg-accent text-accent-foreground hover:bg-accent/90"
      : "bg-transparent text-muted-foreground"
  );
}
