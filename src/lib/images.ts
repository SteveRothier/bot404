export function getSupabaseStorageHostname(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isGifUrl(src: string): boolean {
  try {
    return new URL(src).pathname.toLowerCase().endsWith(".gif");
  } catch {
    return src.toLowerCase().includes(".gif");
  }
}

export function isOptimizableRemoteImage(src: string): boolean {
  if (!src.startsWith("http")) return false;
  if (isGifUrl(src)) return false;
  const hostname = getSupabaseStorageHostname();
  if (!hostname) return false;
  try {
    return new URL(src).hostname === hostname;
  } catch {
    return false;
  }
}
