function getSupabaseStorageHostname(): string | null {
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

export function isSvgUrl(src: string): boolean {
  try {
    const pathname = new URL(src).pathname.toLowerCase();
    return pathname.endsWith(".svg") || pathname.includes("/svg");
  } catch {
    const lower = src.toLowerCase();
    return lower.includes(".svg") || lower.includes("/svg");
  }
}

const DICEBEAR_HOST = "api.dicebear.com";

export function isOptimizableRemoteImage(src: string): boolean {
  if (!src.startsWith("http")) return false;
  if (isGifUrl(src)) return false;
  if (isSvgUrl(src)) return false;
  try {
    const { hostname } = new URL(src);
    const supabaseHost = getSupabaseStorageHostname();
    if (supabaseHost && hostname === supabaseHost) return true;
    return hostname === DICEBEAR_HOST;
  } catch {
    return false;
  }
}
