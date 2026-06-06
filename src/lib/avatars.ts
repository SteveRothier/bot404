export const DICEBEAR_STYLE = "9.x/bottts-neutral";

export function dicebearAvatarUrl(
  seed: string,
  format: "png" | "svg" = "png"
): string {
  return `https://api.dicebear.com/${DICEBEAR_STYLE}/${format}?seed=${encodeURIComponent(seed)}`;
}

/** URL affichable : vide → Dicebear PNG, SVG Dicebear → PNG (base-ui échoue sur SVG). */
export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  fallbackSeed: string
): string {
  const trimmed = avatarUrl?.trim();
  if (!trimmed) return dicebearAvatarUrl(fallbackSeed);
  if (trimmed.includes("api.dicebear.com") && trimmed.includes("/svg?")) {
    return trimmed.replace("/svg?", "/png?");
  }
  return trimmed;
}
