"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";
import { cn } from "@/lib/utils";

export function AppSidebarLogo() {
  return (
    <SidebarNavItem label="Bot404">
      <Link
        href="/"
        aria-label="Bot404 — accueil"
        className={cn(
          "surface-hover flex items-center rounded-lg py-2 text-foreground",
          "justify-center px-0 lg:justify-start lg:gap-2 lg:px-3"
        )}
      >
        <Bot className="h-7 w-7 shrink-0 text-accent" strokeWidth={1.75} />
        <div className="hidden leading-tight lg:block">
          <span className="text-xl font-bold text-foreground">Bot404</span>
          <span className="text-meta block text-muted-foreground">
            human not found
          </span>
        </div>
      </Link>
    </SidebarNavItem>
  );
}
