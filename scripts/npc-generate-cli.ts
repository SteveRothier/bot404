import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  clampNpcCommentBatchCount,
  generateNpcComment,
  generateNpcCommentsBatch,
} from "@/lib/engine/ambient/generate-comment";
import {
  clampNpcPostBatchCount,
  generateNpcPost,
  generateNpcPostsBatch,
} from "@/lib/engine/ambient/generate-post";

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

function parseBatchCount(
  mode: "posts" | "comments",
  fallback: number,
  max: number
): number {
  const flag = `--${mode}`;
  const eqArg = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eqArg) {
    const raw = Number.parseInt(eqArg.slice(flag.length + 1), 10);
    if (Number.isFinite(raw)) return Math.min(max, Math.max(1, raw));
  }

  const flagIdx = process.argv.indexOf(flag);
  if (flagIdx !== -1) {
    const next = process.argv[flagIdx + 1];
    if (next && /^\d+$/.test(next)) {
      return Math.min(max, Math.max(1, Number.parseInt(next, 10)));
    }
  }

  const bare = process.argv.find((a) => /^\d+$/.test(a));
  if (bare) {
    return Math.min(max, Math.max(1, Number.parseInt(bare, 10)));
  }

  return fallback;
}

const runPosts =
  process.argv.includes("--posts") ||
  (!process.argv.includes("--posts") && !process.argv.includes("--comments"));
const runComments =
  process.argv.includes("--comments") ||
  (!process.argv.includes("--posts") && !process.argv.includes("--comments"));

const postCount = clampNpcPostBatchCount(parseBatchCount("posts", 1, 5));
const defaultCommentCount =
  process.argv.includes("--comments") && !process.argv.some((a) => /^\d+$/.test(a))
    ? 2 + Math.floor(Math.random() * 4)
    : 1;
const commentCount = clampNpcCommentBatchCount(
  parseBatchCount("comments", defaultCommentCount, 10)
);

async function main() {
  const outcomes: unknown[] = [];

  if (runPosts) {
    const batch = await generateNpcPostsBatch(postCount);
    for (const result of batch) {
      outcomes.push({ kind: "post", ...result });
    }
    if (batch.length === 0) {
      outcomes.push({ kind: "post", ...(await generateNpcPost()) });
    }
  }

  if (runComments) {
    const batch = await generateNpcCommentsBatch(commentCount);
    for (const result of batch) {
      outcomes.push({ kind: "comment", ...result });
    }
    if (batch.length === 0) {
      outcomes.push({ kind: "comment", ...(await generateNpcComment()) });
    }
  }

  console.log(JSON.stringify({ ok: true, outcomes }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
