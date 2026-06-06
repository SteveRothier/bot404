import { createClient } from "@supabase/supabase-js";

/**
 * Client lecture seule sans cookies — utilisable dans `unstable_cache`.
 * Les lectures publiques (stats, hashtags, factions, etc.) passent par ici.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
