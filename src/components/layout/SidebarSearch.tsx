"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { SearchBar } from "@/components/layout/SearchBar";
import { SidebarNavItem } from "@/components/layout/SidebarNavItem";

export function SidebarSearch() {
  return (
    <>
      <SidebarNavItem label="Rechercher" className="max-lg:flex max-lg:justify-center">
        <Link
          href="/search"
          aria-label="Rechercher"
          className="surface-hover flex size-[52px] items-center justify-center rounded-full text-foreground lg:hidden"
        >
          <Search className="size-[26px]" strokeWidth={1.75} />
        </Link>
      </SidebarNavItem>
      <div className="hidden lg:block">
        <SearchBar />
      </div>
    </>
  );
}
