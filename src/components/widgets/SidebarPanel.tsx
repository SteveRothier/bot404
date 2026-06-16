import { cn } from "@/lib/utils";

type PanelProps = {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function SidebarPanel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-background/80",
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 pb-1 pt-2.5">
        <h2 className="text-[15px] font-bold text-foreground">{title}</h2>
        {action}
      </header>
      <div className={cn("p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

type SectionProps = {
  children: React.ReactNode;
  className?: string;
};

export function SidebarPanelSection({ children, className }: SectionProps) {
  return (
    <div className={cn("border-t border-border/60 pt-2", className)}>
      {children}
    </div>
  );
}
