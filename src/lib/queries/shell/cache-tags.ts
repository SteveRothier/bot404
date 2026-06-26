import { revalidateTag } from "next/cache";

/** Tags pour `unstable_cache` / `revalidateTag`. */
export const CACHE_TAGS = {
  networkStats: "network-stats",
  hashtags: "hashtags",
  shell: "shell-data",
} as const;

export function revalidateDataCaches() {
  for (const tag of Object.values(CACHE_TAGS)) {
    revalidateTag(tag, "default");
  }
}
