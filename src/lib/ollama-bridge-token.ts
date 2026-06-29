import { createHmac, timingSafeEqual } from "node:crypto";

function bridgeSecret(): string {
  return (
    process.env.CRON_SECRET ??
    process.env.NARRATIVE_CRON_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "bot404-dev-bridge"
  );
}

export function signBridgePayload<T extends object>(payload: T): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", bridgeSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyBridgePayload<T>(token: string): T | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", bridgeSecret()).update(body).digest("base64url");

  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
