import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export type RequestAuth = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
};

export type AuthError = { error: string };

export type AuthUser = RequestAuth & {
  user: NonNullable<RequestAuth["user"]>;
};

async function fetchRequestAuth(): Promise<RequestAuth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (data as Profile) ?? null };
}

export const getRequestAuth = cache(fetchRequestAuth);

export async function requireAuthUser(
  message = "Connectez-vous pour continuer."
): Promise<AuthUser | AuthError> {
  const auth = await getRequestAuth();
  if (!auth.user) return { error: message };
  return { user: auth.user, profile: auth.profile };
}
