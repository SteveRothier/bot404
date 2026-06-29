import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(resolve(process.cwd(), ".env.local"));

const checks: { name: string; ok: boolean; detail: string }[] = [];

checks.push({
  name: "NEXT_PUBLIC_SUPABASE_URL",
  ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  detail: process.env.NEXT_PUBLIC_SUPABASE_URL ? "défini" : "manquant",
});

checks.push({
  name: "SUPABASE_SERVICE_ROLE_KEY",
  ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  detail: process.env.SUPABASE_SERVICE_ROLE_KEY ? "défini" : "manquant (requis npc:tick)",
});

async function checkOllama() {
  const url = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
    checks.push({
      name: "Ollama",
      ok: res.ok,
      detail: res.ok ? url : `HTTP ${res.status}`,
    });
  } catch {
    checks.push({
      name: "Ollama",
      ok: false,
      detail: `${url} — lancez ollama serve`,
    });
  }
}

async function checkSupabaseNarrative() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    checks.push({
      name: "Tables narrative",
      ok: false,
      detail: "clés Supabase manquantes",
    });
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { error: arcsError } = await supabase
    .from("narrative_arcs")
    .select("slug, status, mode")
    .limit(3);

  checks.push({
    name: "Tables narrative",
    ok: !arcsError,
    detail: arcsError
      ? arcsError.message
      : "narrative_arcs accessible",
  });

  if (!arcsError) {
    const { data: arcs } = await supabase
      .from("narrative_arcs")
      .select("id, slug, status, mode");

    const scripted = arcs?.find((a) => a.slug === "chasse-humains-acte-1");
    const emergent = arcs?.find((a) => a.slug === "reseau-reactif");

    checks.push({
      name: "Acte 1 (scripté)",
      ok: scripted?.status !== "active",
      detail: scripted
        ? `status=${scripted.status} (doit être paused ou completed)`
        : "arc introuvable",
    });

    checks.push({
      name: "Mode émergent",
      ok: emergent?.status === "active",
      detail: emergent ? `status=${emergent.status}` : "arc introuvable",
    });

    const { count } = await supabase
      .from("narrative_signals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { data: oldestPending } = await supabase
      .from("narrative_signals")
      .select("created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let pendingDetail = String(count ?? 0);
    if (oldestPending?.created_at) {
      const ageMin = Math.floor(
        (Date.now() - new Date(oldestPending.created_at).getTime()) / 60_000
      );
      const perTick = Number.parseInt(
        process.env.NARRATIVE_SIGNALS_PER_TICK ?? "2",
        10
      );
      const etaMin = Math.ceil((count ?? 0) / Math.max(perTick, 1)) * 15;
      pendingDetail += ` — plus ancien: ${ageMin} min, ETA ~${etaMin} min (tick 15 min)`;
    }

    checks.push({
      name: "Signaux pending",
      ok: true,
      detail: pendingDetail,
    });

    const { error: commentLikesError } = await supabase
      .from("comment_likes")
      .select("comment_id", { count: "exact", head: true });

    checks.push({
      name: "Engagement commentaires",
      ok: !commentLikesError,
      detail: commentLikesError
        ? `comment_likes inaccessible (${commentLikesError.message}) — lancez db push`
        : "comment_likes + relay_count OK",
    });
  }
}

function checkMediaEnv() {
  const imageOk = !!(process.env.IMAGE_API_URL && process.env.IMAGE_API_KEY);
  const gifOk = !!(process.env.TENOR_API_KEY || process.env.GIPHY_API_KEY);
  const steamKey = !!process.env.STEAM_WEB_API_KEY?.trim();

  checks.push({
    name: "Médias NPC (IMAGE API)",
    ok: true,
    detail: imageOk
      ? `${process.env.IMAGE_API_URL} (modèle ${process.env.IMAGE_API_MODEL ?? "flux-schnell"})`
      : "non configuré",
  });

  checks.push({
    name: "Médias NPC (GIF)",
    ok: true,
    detail: gifOk
      ? process.env.TENOR_API_KEY
        ? "Tenor"
        : "Giphy"
      : "non configuré",
  });

  checks.push({
    name: "Médias NPC (Steam)",
    ok: true,
    detail: steamKey ? "clé définie (vérif API au runtime)" : "non configuré",
  });
}

async function checkSteamApi() {
  const key = process.env.STEAM_WEB_API_KEY?.trim();
  if (!key) return;

  const { verifySteamWebApiKey } = await import("@/lib/engine/content/steam-media");
  const ok = await verifySteamWebApiKey();
  const idx = checks.findIndex((c) => c.name === "Médias NPC (Steam)");
  if (idx >= 0) {
    checks[idx] = {
      name: "Médias NPC (Steam)",
      ok,
      detail: ok
        ? "STEAM_WEB_API_KEY valide (GetServerInfo)"
        : "clé définie mais API Steam inaccessible ou invalide",
    };
  }
}

async function main() {
  await checkOllama();
  checkMediaEnv();
  await checkSteamApi();
  await checkSupabaseNarrative();

  const allOk = checks.every((c) => c.ok);
  console.log(JSON.stringify({ ok: allOk, checks }, null, 2));
  process.exit(allOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
