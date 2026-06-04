import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeNarrativeInteractions } from "@/lib/queries/narrative-ui-merge";
import type { NarrativeInteractionRow } from "@/lib/queries/narrative-ui";

function row(
  id: number,
  kind: "comment" | "post",
  created_at: string
): NarrativeInteractionRow {
  return {
    id,
    kind,
    content: "test",
    created_at,
    link_post_id: id,
    trigger_post_id: null,
    npc_username: "Bot",
    human_username: "Human",
  };
}

describe("mergeNarrativeInteractions", () => {
  it("trie par date desc et limite", () => {
    const merged = mergeNarrativeInteractions(
      [
        row(1, "comment", "2026-06-01T10:00:00Z"),
        row(2, "post", "2026-06-03T10:00:00Z"),
        row(3, "comment", "2026-06-02T10:00:00Z"),
      ],
      2
    );
    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, 2);
    assert.equal(merged[1].id, 3);
  });
});
