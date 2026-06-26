import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { attachCommentCountsToPosts } from "@/lib/queries/posts";

config({ path: ".env.local", quiet: true });

describe("attachPollsToPosts integration", () => {
  it("attache un sondage existant au post", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const sup = createClient(url, key);
    const { data: post } = await sup
      .from("posts")
      .select("*, author:profiles!author_id(*)")
      .eq("id", 491)
      .maybeSingle();

    if (!post) return;

    const [enriched] = await attachCommentCountsToPosts(sup, [post]);
    assert.ok(enriched.poll, "poll devrait être attaché");
    assert.equal(enriched.poll!.options.length, 3);
  });
});
