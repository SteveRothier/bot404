"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { searchComposerGifs } from "@/app/actions/gifs";
import type { GiphyGifResult } from "@/lib/engine/content/gif-search";
import { cn } from "@/lib/utils";
import { GifPickerScrollArea } from "@/components/feed/GifPickerScrollArea";
import "@/components/feed/gif-picker-overrides.css";

type Props = {
  onSelect: (gif: { url: string; previewUrl: string }) => void;
};

export default function GifPickerPanel({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyGifResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<
    "not_configured" | "unauthorized" | null
  >(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    const response = await searchComposerGifs(searchQuery || undefined);
    if (response.error === "not_configured") {
      setError("not_configured");
      setResults([]);
    } else if (response.error === "unauthorized") {
      setError("unauthorized");
      setResults([]);
    } else {
      setResults(response.results);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = query.trim() ? 300 : 0;
    debounceRef.current = setTimeout(() => {
      load(query);
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, load]);

  if (error === "not_configured") {
    return (
      <div className="flex h-[400px] w-[340px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
        <p>GIPHY n&apos;est pas configuré.</p>
        <p className="text-xs">
          Ajoutez <code className="text-foreground">GIPHY_API_KEY</code> dans{" "}
          <code className="text-foreground">.env.local</code>.
        </p>
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="flex h-[400px] w-[340px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Connectez-vous pour rechercher des GIF.
      </div>
    );
  }

  return (
    <div className="flex h-[400px] w-[340px] flex-col">
      <div className="border-b border-border p-2">
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher sur Giphy"
            className="bot404-gif-picker-search w-full rounded-md border border-border bg-background py-1.5 pl-3 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
            autoFocus
          />
          {query.length > 0 && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setQuery("")}
              className="bot404-gif-picker-clear absolute right-1.5 top-1/2 -translate-y-1/2"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <GifPickerScrollArea className="pl-2 pt-2 pb-2">
        {loading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center pr-2 text-sm text-muted-foreground">
            Chargement…
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center pr-2 text-sm text-muted-foreground">
            Aucun GIF trouvé.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 pr-2">
            {results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() =>
                  onSelect({ url: gif.url, previewUrl: gif.previewUrl })
                }
                className={cn(
                  "relative aspect-video overflow-hidden rounded-md bg-secondary/50",
                  "transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gif.previewUrl}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </GifPickerScrollArea>
    </div>
  );
}
