import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickReactionKindForNpc } from "@/lib/engine/casting/reaction-cast";
import type { Profile } from "@/lib/supabase/types";

function npc(username: string): Profile {
  return {
    id: username,
    username,
    avatar_url: null,
    bio: null,
    is_npc: true,
    personality: null,
    popularity_score: 0,
    trust_score: 0,
    influence_score: 0,
    created_at: new Date().toISOString(),
  };
}

describe("pickReactionKindForNpc", () => {
  it("retourne toujours relay", () => {
    assert.equal(pickReactionKindForNpc(npc("TrollMaster"), "rumor", "on dit"), "relay");
    assert.equal(pickReactionKindForNpc(npc("HAL_9000"), "theory", "hypothèse"), "relay");
  });
});
