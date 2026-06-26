import { cookies } from "next/headers";

const COOLDOWN_MS = 30_000;

export async function checkNpcCooldown(
  userId: string,
  kind: "post" | "comment"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookieStore = await cookies();
  const key = `npc_gen_${kind}_${userId}`;
  const last = cookieStore.get(key)?.value;
  const now = Date.now();

  if (last) {
    const elapsed = now - Number(last);
    if (elapsed < COOLDOWN_MS) {
      const seconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return {
        ok: false,
        error: `Patientez ${seconds}s avant une nouvelle génération.`,
      };
    }
  }

  return { ok: true };
}

export async function setNpcCooldown(
  userId: string,
  kind: "post" | "comment"
): Promise<void> {
  const cookieStore = await cookies();
  const key = `npc_gen_${kind}_${userId}`;
  cookieStore.set(key, String(Date.now()), {
    maxAge: COOLDOWN_MS / 1000,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
