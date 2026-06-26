"use server";

import {
  fetchGiphyTrending,
  searchGiphyGifs,
  type GiphyGifResult,
} from "@/lib/engine/content/gif-search";
import { createClient } from "@/lib/supabase/server";

const COMPOSER_GIF_LIMIT = 50;

export async function searchComposerGifs(query?: string): Promise<{
  results: GiphyGifResult[];
  error?: "not_configured" | "fetch_failed" | "unauthorized";
}> {
  if (!process.env.GIPHY_API_KEY?.trim()) {
    return { results: [], error: "not_configured" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { results: [], error: "unauthorized" };
  }

  const trimmed = query?.trim() ?? "";
  const results = trimmed
    ? await searchGiphyGifs(trimmed, COMPOSER_GIF_LIMIT)
    : await fetchGiphyTrending(COMPOSER_GIF_LIMIT);

  return { results };
}
