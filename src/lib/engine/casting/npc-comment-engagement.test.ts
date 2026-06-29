import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickWeightedComment } from "@/lib/engine/casting/npc-comment-engagement";

describe("pickWeightedComment", () => {
  it("retourne null pour une liste vide", () => {
    assert.equal(pickWeightedComment([]), null);
  });

  it("priorise un commentaire ciblé", () => {
    const comments = [
      { id: 1, relay_count: 10 },
      { id: 2, relay_count: 0 },
      { id: 3, relay_count: 0 },
    ];
    let pickedId2 = 0;
    for (let i = 0; i < 20; i++) {
      const pick = pickWeightedComment(comments, 2, () => 0.01);
      if (pick?.id === 2) pickedId2 += 1;
    }
    assert.ok(pickedId2 >= 15);
  });

  it("favorise les commentaires peu likés sans priorité", () => {
    const comments = [
      { id: 1, relay_count: 20 },
      { id: 2, relay_count: 0 },
    ];
    let pickedLow = 0;
    for (let i = 0; i < 30; i++) {
      const pick = pickWeightedComment(comments, undefined, () => Math.random());
      if (pick?.id === 2) pickedLow += 1;
    }
    assert.ok(pickedLow > 10);
  });
});
