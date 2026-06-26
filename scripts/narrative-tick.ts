import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { runNarrativeTick } from "@/lib/engine/reactive/tick";

function loadDotEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

function parseMaxSignals(argv: string[]): number | undefined {
  for (const arg of argv) {
    if (arg.startsWith("--max=")) {
      const n = Number.parseInt(arg.slice("--max=".length), 10);
      if (Number.isFinite(n) && n >= 1) return Math.min(n, 5);
    }
  }
  const fast = argv.includes("--fast");
  if (fast) return 3;
  return undefined;
}

loadDotEnv(resolve(process.cwd(), ".env.local"));

async function main() {
  const maxSignals = parseMaxSignals(process.argv.slice(2));
  const result = await runNarrativeTick(
    maxSignals !== undefined ? { maxSignals } : {}
  );
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
