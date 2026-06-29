import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getCommentLikeChance,
  getCommentReplyChance,
  getNpcPostReactionBounds,
  rollChance,
} from "@/lib/engine/reactive/tick-config";

describe("tick-config engagement", () => {
  it("expose des bornes de réaction post par défaut", () => {
    const bounds = getNpcPostReactionBounds();
    assert.equal(bounds.min, 1);
    assert.equal(bounds.max, 4);
  });

  it("chances par défaut dans ]0,1]", () => {
    assert.ok(getCommentReplyChance() > 0 && getCommentReplyChance() <= 1);
    assert.ok(getCommentLikeChance() > 0 && getCommentLikeChance() <= 1);
  });

  it("rollChance respecte le tirage", () => {
    assert.equal(rollChance(1, () => 0.5), true);
    assert.equal(rollChance(0, () => 0.5), false);
    assert.equal(rollChance(0.6, () => 0.7), false);
  });
});
