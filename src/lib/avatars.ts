import { isSvgUrl } from "@/lib/images";

const DICEBEAR_STYLE = "9.x/bottts-neutral";

export function dicebearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/${DICEBEAR_STYLE}/png?seed=${encodeURIComponent(seed)}`;
}

function isDicebearUrl(url: string): boolean {
  return url.includes("api.dicebear.com");
}

function dicebearSeedFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("dicebear.com")) return null;
    const seed = parsed.searchParams.get("seed");
    if (seed) return seed;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? null;
  } catch {
    return null;
  }
}

export function avatarFallbackSeed(profile: {
  id: string;
  username: string;
  is_npc: boolean;
}): string {
  return profile.is_npc ? profile.username : profile.id;
}

/** Hôte externe (Discord, Supabase, etc.) — requiert souvent referrerPolicy no-referrer. */
export function isExternalAvatarUrl(url: string): boolean {
  try {
    return new URL(url).hostname !== "api.dicebear.com";
  } catch {
    return false;
  }
}

export function isDiscordAvatarUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith("discordapp.net") ||
      host.endsWith("discordapp.com") ||
      host.endsWith("discord.com")
    );
  } catch {
    return false;
  }
}

export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  fallbackSeed: string
): string {
  const trimmed = avatarUrl?.trim();
  if (!trimmed) return dicebearAvatarUrl(fallbackSeed);

  if (isDicebearUrl(trimmed) && isSvgUrl(trimmed)) {
    const seed = dicebearSeedFromUrl(trimmed) ?? fallbackSeed;
    return dicebearAvatarUrl(seed);
  }

  if (isSvgUrl(trimmed)) {
    return dicebearAvatarUrl(fallbackSeed);
  }

  return trimmed;
}

/** Normalise l'URL avant enregistrement en base (SVG Dicebear → PNG). */
export function normalizeAvatarUrlForSave(
  avatarUrl: string | null | undefined,
  fallbackSeed: string
): string | null {
  const trimmed = avatarUrl?.trim();
  if (!trimmed) return null;
  return resolveAvatarUrl(trimmed, fallbackSeed);
}
