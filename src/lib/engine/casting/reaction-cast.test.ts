import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HUNT_ARCHETYPES,
  MEME_ARCHETYPES,
  pickReactionKindForNpc,
} from "@/lib/engine/casting/reaction-cast";
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
  it("hunt NPC relay sur message neutre", () => {
    const hunt = npc(HUNT_ARCHETYPES[0]);
    assert.equal(
      pickReactionKindForNpc(hunt, "message", "salut le réseau", () => 0.5),
      "relay"
    );
  });

  it("meme NPC amplify sur rumeur quand tirage bas", () => {
    const meme = npc(MEME_ARCHETYPES[0]);
    assert.equal(
      pickReactionKindForNpc(meme, "rumor", "on dit que...", () => 0.1),
      "amplify"
    );
  });

  it("flag rare sur théorie pour NPC générique", () => {
    const generic = npc("RandomBot");
    assert.equal(
      pickReactionKindForNpc(generic, "theory", "hypothèse", () => 0.99),
      "relay"
    );
    assert.equal(
      pickReactionKindForNpc(generic, "theory", "hypothèse", () => 0.01),
      "flag"
    );
  });
});
