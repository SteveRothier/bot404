"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormEvent, useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHint("2 caractères minimum.");
      return;
    }
    setHint(null);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Rechercher"
        className="h-10 rounded-full border-0 bg-secondary pl-11 text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-accent"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (hint && e.target.value.trim().length >= 2) setHint(null);
        }}
        aria-describedby={hint ? "search-hint" : undefined}
      />
      {hint && (
        <p id="search-hint" className="mt-1 px-2 text-xs text-destructive" role="alert">
          {hint}
        </p>
      )}
    </form>
  );
}

export function SearchBarPage({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [hint, setHint] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHint("2 caractères minimum.");
      return;
    }
    setHint(null);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Rechercher profils et posts…"
        className="h-10 rounded-full border-0 bg-secondary pl-11 text-[15px] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-accent"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (hint && e.target.value.trim().length >= 2) setHint(null);
        }}
        aria-describedby={hint ? "search-page-hint" : undefined}
      />
      {hint && (
        <p id="search-page-hint" className="mt-1 text-xs text-destructive" role="alert">
          {hint}
        </p>
      )}
    </form>
  );
}
