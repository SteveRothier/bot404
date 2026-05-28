import { createServiceClient, verifyCron } from "../_shared/supabase.ts";
import { generateText } from "../_shared/llm.ts";

Deno.serve(async (req) => {
  if (!verifyCron(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, author_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!posts?.length) {
    return new Response(JSON.stringify({ ok: true, created: 0 }));
  }

  const { data: npcs } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true);

  if (!npcs?.length) {
    return new Response(JSON.stringify({ error: "no npcs" }), { status: 500 });
  }

  const attempted = Math.min(3, posts.length);
  let created = 0;
  let failed = 0;

  for (let i = 0; i < 3 && i < posts.length; i++) {
    const post = posts[i];
    const commenters = npcs.filter((n) => n.id !== post.author_id);
    if (!commenters.length) continue;

    const npc = commenters[Math.floor(Math.random() * commenters.length)];
    const p = (npc.personality ?? {}) as Record<string, unknown>;

    const system = `Tu es ${npc.username}. Réponds en commentaire (max 200 caractères), ton: ${p.personality ?? "sarcastique"}. Français.`;
    const user = `Post original: "${post.content}"\nÉcris une réponse courte.`;

    const content = await generateText(system, user, 80);
    if (!content) {
      failed++;
      continue;
    }

    const { error } = await supabase.from("comments").insert({
      post_id: post.id,
      author_id: npc.id,
      content,
    });

    if (!error) {
      created++;
      await supabase
        .from("profiles")
        .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
        .eq("id", npc.id);
    } else {
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, attempted, created, failed }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
