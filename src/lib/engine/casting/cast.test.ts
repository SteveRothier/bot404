import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickNpcForSignal, scoreNpcForSignal } from "@/lib/engine/casting/cast";
import type { NarrativeSignal } from "@/lib/engine/shared/types";
import type { Profile } from "@/lib/supabase/types";

function npc(username: string, id: string, topics: string[] = ["hope"]): Profile {
  return {
    id,
    username,
    avatar_url: null,
    bio: null,
    is_npc: true,
    personality: {
      personality: "test",
      topics,
      writing_style: "short",
      mood: "neutral",
    },
    popularity_score: 100,
    trust_score: 0,
    influence_score: 0,
    created_at: new Date().toISOString(),
  };
}

const signal = (overrides: Partial<NarrativeSignal>): NarrativeSignal => ({
  id: 1,
  kind: "human_post",
  author_id: "human-1",
  post_id: 10,
  comment_id: null,
  reaction_kind: null,
  mentioned_username: null,
  priority: 40,
  status: "pending",
  payload: { post_type: "theory", content: "matrix simulation" },
  result: {},
  created_at: new Date().toISOString(),
  handled_at: null,
  ...overrides,
});

describe("scoreNpcForSignal", () => {
  it("priorise la mention exacte", () => {
    const s = signal({ mentioned_username: "Nova" });
    const score = scoreNpcForSignal(npc("Nova", "n1"), {
      signal: s,
      humanContent: "hello",
    });
    assert.equal(score, 1000);
  });

  it("favorise les topics correspondants", () => {
    const s = signal({ payload: { post_type: "theory" } });
    const match = scoreNpcForSignal(npc("ConspiracyBot", "c1", ["matrix", "5G"]), {
      signal: s,
      humanContent: "matrix",
    });
    const other = scoreNpcForSignal(npc("Nova", "n1", ["hope"]), { signal: s });
    assert.ok(match > other);
  });

  it("favorise les chasseurs sur contenu suspect", () => {
    const s = signal({ payload: { post_type: "theory" } });
    const hunter = scoreNpcForSignal(npc("ConspiracyBot", "c1", ["matrix"]), {
      signal: s,
      humanContent: "intrus humain",
      huntContent: true,
    });
    const other = scoreNpcForSignal(npc("Nova", "n1"), {
      signal: s,
      humanContent: "intrus humain",
      huntContent: true,
    });
    assert.ok(hunter > other);
  });
});

describe("pickNpcForSignal", () => {
  it("exclut les NPC déjà présents sur le fil", () => {
    const s = signal({ payload: { post_type: "theory" } });
    const pool = [
      npc("ConspiracyBot", "c1", ["matrix"]),
      npc("Nova", "n1"),
    ];
    const picked = pickNpcForSignal(
      pool,
      { signal: s, excludeNpcIds: new Set(["c1"]) },
      () => 0
    );
    assert.equal(picked?.username, "Nova");
  });
});
