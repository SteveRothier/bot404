import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(filePath) {
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

loadDotEnv(resolve(process.cwd(), ".env.local"));

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3.5:4b";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const runPosts =
  process.argv.includes("--posts") ||
  (!process.argv.includes("--posts") && !process.argv.includes("--comments"));
const runComments =
  process.argv.includes("--comments") ||
  (!process.argv.includes("--posts") && !process.argv.includes("--comments"));

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ollamaChat(system, user) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      think: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) {
    const txt = await response.text();
    console.error("Ollama error", txt);
    return null;
  }
  const data = await response.json();
  const text = data?.message?.content?.trim();
  if (!text) return null;
  return text;
}

async function generatePosts() {
  const result = { attempted: 0, created: 0, failed: 0 };
  const { data: npcs, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true)
    .order("popularity_score", { ascending: true })
    .limit(5);

  if (error || !npcs?.length) {
    console.error("No NPC found", error?.message);
    return result;
  }

  const npc = npcs[Math.floor(Math.random() * npcs.length)];
  const p = npc.personality ?? {};
  result.attempted = 1;

  const system = `Tu es ${npc.username}, un NPC sur un réseau social fictif.
Personnalité: ${p.personality ?? "neutre"}
Style: ${p.writing_style ?? "court"}
Sujets: ${(p.topics ?? ["IA"]).join(", ")}
Écris UN seul post (max 280 caractères), sarcastique ou drôle, avec 1-2 hashtags. Français.`;
  const user = "Écris un nouveau post pour le feed.";

  const content = await ollamaChat(system, user);
  if (!content) {
    result.failed++;
    return result;
  }

  const { error: insertError } = await supabase.from("posts").insert({
    author_id: npc.id,
    content: content.slice(0, 500),
    likes_count: Math.floor(Math.random() * 500) + 50,
  });

  if (insertError) {
    console.error("Insert post failed", insertError.message);
    result.failed++;
    return result;
  }

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  result.created++;
  return result;
}

async function generateComments() {
  const result = { attempted: 0, created: 0, failed: 0 };
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, author_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!posts?.length) return result;

  const { data: npcs } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true);

  if (!npcs?.length) return result;

  const max = Math.min(3, posts.length);
  result.attempted = max;
  for (let i = 0; i < max; i++) {
    const post = posts[i];
    const commenters = npcs.filter((n) => n.id !== post.author_id);
    if (!commenters.length) {
      result.failed++;
      continue;
    }
    const npc = commenters[Math.floor(Math.random() * commenters.length)];
    const p = npc.personality ?? {};
    const system = `Tu es ${npc.username}. Réponds en commentaire (max 200 caractères), ton: ${p.personality ?? "sarcastique"}. Français.`;
    const user = `Post original: "${post.content}"\nÉcris une réponse courte.`;
    const content = await ollamaChat(system, user);
    if (!content) {
      result.failed++;
      continue;
    }
    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      author_id: npc.id,
      content: content.slice(0, 300),
    });
    if (error) {
      console.error("Insert comment failed", error.message);
      result.failed++;
      continue;
    }
    await supabase
      .from("profiles")
      .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
      .eq("id", npc.id);
    result.created++;
  }
  return result;
}

const output = {
  mode: { posts: runPosts, comments: runComments },
  model: OLLAMA_MODEL,
  posts: { attempted: 0, created: 0, failed: 0 },
  comments: { attempted: 0, created: 0, failed: 0 },
};

if (runPosts) output.posts = await generatePosts();
if (runComments) output.comments = await generateComments();

console.log(JSON.stringify(output));
