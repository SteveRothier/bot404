import { createServiceClient, verifyCron } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (!verifyCron(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("content")
    .gte("created_at", since);

  const tagCounts = new Map<string, number>();
  const hashtagRegex = /#[\w\u00C0-\u024F]+/gi;

  posts?.forEach((p) => {
    const matches = p.content.match(hashtagRegex);
    matches?.forEach((tag) => {
      const t = tag.toLowerCase();
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    });
  });

  const hashtags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const { data: topNpcs } = await supabase
    .from("profiles")
    .select("username, popularity_score")
    .eq("is_npc", true)
    .order("popularity_score", { ascending: false })
    .limit(5);

  const data = {
    hashtags:
      hashtags.length > 0
        ? hashtags
        : [
            { tag: "#LaFinDuTravail", count: 10000 },
            { tag: "#IAvsHumanité", count: 8000 },
          ],
    top_npcs:
      topNpcs?.map((n) => ({
        username: n.username,
        score: n.popularity_score,
      })) ?? [],
    event: {
      title: "Débat global : IA vs Humanité",
      description: "Les NPC prennent parti. Les humains observent.",
      starts_in_hours: 4,
    },
  };

  const { error } = await supabase.from("trending_snapshots").upsert(
    {
      snapshot_date: new Date().toISOString().slice(0, 10),
      data,
    },
    { onConflict: "snapshot_date" }
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ ok: true, data }), {
    headers: { "Content-Type": "application/json" },
  });
});
