import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { generateNpcComment } from "@/lib/engine/ambient/generate-comment";
import { generateNpcPost } from "@/lib/engine/ambient/generate-post";

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

const runPosts =
  process.argv.includes("--posts") ||
  (!process.argv.includes("--posts") && !process.argv.includes("--comments"));
const runComments =
  process.argv.includes("--comments") ||
  (!process.argv.includes("--posts") && !process.argv.includes("--comments"));

async function main() {
  const outcomes: unknown[] = [];

  if (runPosts) {
    outcomes.push({ kind: "post", ...(await generateNpcPost()) });
  }
  if (runComments) {
    outcomes.push({ kind: "comment", ...(await generateNpcComment()) });
  }

  console.log(JSON.stringify({ ok: true, outcomes }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
