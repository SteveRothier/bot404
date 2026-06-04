import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { checkOllamaStatus } from "@/lib/ollama";
import { runNarrativeTick } from "@/lib/narrative/tick";
import { enqueueHumanPostSignal } from "@/lib/narrative/signals";
import {
  getActiveEmergentArc,
  getNarrativeStateForUi,
} from "@/lib/narrative/queries";
import { getRecentNarrativeInteractions } from "@/lib/queries/narrative-ui";
import { createAdminClient } from "@/lib/supabase/admin";

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

const SESSION_THEORY =
  "[Session test] Les logs du secteur 7G montrent des signatures humaines déguisées en NPC. Qui contrôle le filtre PurBot ?";

async function main() {
  const report: Record<string, unknown> = {
    ok: false,
    steps: [] as { name: string; ok: boolean; detail: string }[],
  };
  const steps = report.steps as { name: string; ok: boolean; detail: string }[];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    steps.push({
      name: "env",
      ok: false,
      detail: "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant",
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const ollama = await checkOllamaStatus();
  steps.push({
    name: "ollama",
    ok: ollama.online,
    detail: ollama.online ? "en ligne" : "offline — lancez ollama serve",
  });

  const emergent = await getActiveEmergentArc();
  steps.push({
    name: "emergent_arc",
    ok: emergent !== null,
    detail: emergent ? `${emergent.slug} active` : "reseau-reactif inactif",
  });

  const supabase = createAdminClient();
  const { data: human } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("is_npc", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!human) {
    steps.push({
      name: "human_profile",
      ok: false,
      detail: "Aucun profil humain — créez un compte via /login",
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  steps.push({
    name: "human_profile",
    ok: true,
    detail: `@${human.username}`,
  });

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      author_id: human.id,
      content: SESSION_THEORY,
      post_type: "theory",
    })
    .select("id")
    .single();

  if (postError || !post) {
    steps.push({
      name: "theory_post",
      ok: false,
      detail: postError?.message ?? "insert failed",
    });
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  await enqueueHumanPostSignal(human.id, post.id, SESSION_THEORY, "theory");
  steps.push({
    name: "theory_post",
    ok: true,
    detail: `post_id=${post.id}`,
  });

  const stateBefore = await getNarrativeStateForUi();
  steps.push({
    name: "pending_before_tick",
    ok: (stateBefore.pendingSignals ?? 0) > 0,
    detail: `${stateBefore.pendingSignals} interaction(s) en attente`,
  });

  const tick = await runNarrativeTick();
  const tickOk = tick.handled && tick.mode === "emergent";
  steps.push({
    name: "npc_tick",
    ok: tickOk,
    detail: JSON.stringify(tick),
  });

  const interactions = await getRecentNarrativeInteractions(3);
  steps.push({
    name: "trending_data",
    ok: interactions.length > 0,
    detail:
      interactions.length > 0
        ? `${interactions.length} réponse(s) récente(s) — @${interactions[0].npc_username}`
        : "aucune réponse narrative en base (post émergent possible, pas dans Trending commentaires)",
  });

  report.ok = steps.every((s) => s.ok) || tickOk;
  report.hint =
    tickOk
      ? "Session technique OK. Vérifiez le fil sur http://localhost:3000 et /trending"
      : "Corrigez les étapes en échec puis rejouez en UI (Scénario A).";

  console.log(JSON.stringify(report, null, 2));
  process.exit(tickOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
