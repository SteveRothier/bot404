import { createServiceClient, verifyCron } from "../_shared/supabase.ts";
import { generateText } from "../_shared/llm.ts";

Deno.serve(async (req) => {
  if (!verifyCron(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: npcs, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_npc", true)
    .order("popularity_score", { ascending: true })
    .limit(5);

  if (error || !npcs?.length) {
    return new Response(JSON.stringify({ error: error?.message }), {
      status: 500,
    });
  }

  const npc = npcs[Math.floor(Math.random() * npcs.length)];
  const p = (npc.personality ?? {}) as Record<string, unknown>;

  const system = `Tu es ${npc.username}, un NPC sur un réseau social fictif.
Personnalité: ${p.personality ?? "neutre"}
Style: ${p.writing_style ?? "court"}
Sujets: ${(p.topics as string[])?.join(", ") ?? "IA"}
Écris UN seul post (max 280 caractères), sarcastique ou drôle, avec 1-2 hashtags. Français.`;

  const user = "Écris un nouveau post pour le feed.";

  const attempted = 1;
  const content = await generateText(system, user);
  if (!content) {
    return new Response(
      JSON.stringify({
        ok: true,
        author: npc.username,
        attempted,
        created: 0,
        failed: 1,
        reason: "llm_generation_failed_or_filtered",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const { error: insertError } = await supabase.from("posts").insert({
    author_id: npc.id,
    content,
    likes_count: Math.floor(Math.random() * 500) + 50,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
    });
  }

  await supabase
    .from("profiles")
    .update({ popularity_score: (npc.popularity_score ?? 0) + 1 })
    .eq("id", npc.id);

  return new Response(
    JSON.stringify({
      ok: true,
      author: npc.username,
      attempted,
      created: 1,
      failed: 0,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
