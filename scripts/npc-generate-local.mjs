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

function pickRandomNpcPostType() {
  const r = Math.random();
  if (r < 0.5) return "message";
  if (r < 0.7) return "theory";
  if (r < 0.85) return "signal";
  return "rumor";
}

const TYPE_INSTRUCTIONS = {
  message:
    "Écris UN post de conversation (max 280 caractères), sarcastique ou drôle, avec 0-2 hashtags. Français.",
  theory:
    "Écris UNE théorie / hypothèse sur ce qui se passe dans le réseau (max 280 caractères). Ton analytique, un peu parano. 0-2 hashtags. Français.",
  signal:
    "Écris UN signal court (max 120 caractères) : fragments, chiffres, binaire partiel ou codes étranges. Style terminal. Pas de hashtag obligatoire. Français.",
  rumor:
    "Écris UNE rumeur (max 280 caractères) qui commence par « On dit que » ou équivalent. Ambigu, non vérifiable. 0-1 hashtag. Français.",
};

function buildNpcLorePromptBlock(activeEvent, latestArchive) {
  const parts = [];
  if (activeEvent) {
    parts.push(
      `Événement mondial actif : « ${activeEvent.title} » — ${activeEvent.description}`
    );
  }
  if (latestArchive) {
    parts.push(
      `Archive récente débloquée : « ${latestArchive.title} » (thème : humanité / simulation).`
    );
  }
  if (parts.length === 0) return "";
  return `\nContexte lore du réseau (à refléter dans le ton, sans casser le personnage) :\n${parts.join("\n")}`;
}

async function fetchNpcLoreContext() {
  const now = new Date().toISOString();
  const [{ data: events }, { data: archives }] = await Promise.all([
    supabase
      .from("world_events")
      .select("id, title, description, effects, starts_at, ends_at")
      .lte("starts_at", now)
      .gte("ends_at", now)
      .order("starts_at", { ascending: false })
      .limit(1),
    supabase
      .from("archives")
      .select("id, title, slug, unlocked_at")
      .not("unlocked_at", "is", null)
      .order("unlocked_at", { ascending: false })
      .limit(1),
  ]);
  return {
    activeEvent: events?.[0] ?? null,
    latestArchive: archives?.[0] ?? null,
  };
}

function parseEventEffects(raw) {
  const e = raw ?? {};
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  const types = arr(e.boost_post_types).filter((t) =>
    ["message", "theory", "signal", "rumor"].includes(t)
  );
  return { sectors: arr(e.sectors), boost_post_types: types };
}

function buildNpcPostPrompt(npc, postType, loreBlock = "") {
  const p = npc.personality ?? {};
  return `Tu es ${npc.username}, un NPC sur le réseau dystopique Bot404.
Personnalité: ${p.personality ?? "neutre"}
Style: ${p.writing_style ?? "court"}
Sujets: ${(p.topics ?? ["IA"]).join(", ")}${loreBlock}
${TYPE_INSTRUCTIONS[postType]}`;
}

function npcPostUserMessage(postType) {
  if (postType === "theory") return "Écris une nouvelle théorie pour le feed.";
  if (postType === "signal") return "Émet un signal sur le réseau.";
  if (postType === "rumor") return "Diffuse une rumeur.";
  return "Écris un nouveau post pour le feed.";
}

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
  const lore = await fetchNpcLoreContext();
  const loreBlock = buildNpcLorePromptBlock(lore.activeEvent, lore.latestArchive);
  const effects = lore.activeEvent
    ? parseEventEffects(lore.activeEvent.effects)
    : { sectors: [], boost_post_types: [] };

  let postType = pickRandomNpcPostType();
  if (effects.boost_post_types.length > 0 && Math.random() < 0.55) {
    postType =
      effects.boost_post_types[
        Math.floor(Math.random() * effects.boost_post_types.length)
      ];
  }
  result.attempted = 1;

  const system = buildNpcPostPrompt(npc, postType, loreBlock);
  const user = npcPostUserMessage(postType);

  const content = await ollamaChat(system, user);
  if (!content) {
    result.failed++;
    return result;
  }

  const sectorCodes = ["1A", "2B", "3C", "4D", "5E", "6F", "7G", "8H"];
  let sector_code =
    Math.random() < 0.4
      ? sectorCodes[Math.floor(Math.random() * sectorCodes.length)]
      : null;
  if (effects.sectors.length > 0 && Math.random() < 0.5) {
    sector_code =
      effects.sectors[Math.floor(Math.random() * effects.sectors.length)];
  }

  const postDelta = {
    message: 0.28,
    theory: 0.38,
    signal: 0.18,
    rumor: 0.42,
  };

  const { data: post, error: insertError } = await supabase
    .from("posts")
    .insert({
      author_id: npc.id,
      content: content.slice(0, 500),
      post_type: postType,
      sector_code,
      likes_count: Math.floor(Math.random() * 500) + 50,
    })
    .select("id")
    .single();

  if (insertError || !post) {
    console.error("Insert post failed", insertError?.message);
    result.failed++;
    return result;
  }

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  if (npc.faction_id) {
    await supabase.rpc("bump_faction_control", {
      p_faction_id: npc.faction_id,
      p_delta: postDelta[postType] ?? 0.25,
    });
  }

  result.created++;
  return result;
}

async function generateComments() {
  const result = { attempted: 0, created: 0, failed: 0 };
  const lore = await fetchNpcLoreContext();
  const loreBlock = buildNpcLorePromptBlock(lore.activeEvent, lore.latestArchive);
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
    const system = `Tu es ${npc.username}. Réponds en commentaire (max 200 caractères), ton: ${p.personality ?? "sarcastique"}. Français.${loreBlock}`;
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
