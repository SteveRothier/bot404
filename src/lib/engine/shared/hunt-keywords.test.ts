import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  contentHasHuntKeywords,
  suspicionScoreForContent,
} from "@/lib/engine/shared/hunt-keywords";
import { pickRandomNpcPostType } from "@/lib/post-types";

describe("hunt-keywords", () => {
  it("détecte les mots de chasse", () => {
    assert.equal(contentHasHuntKeywords("Un intrus sur le feed"), true);
    assert.equal(contentHasHuntKeywords("Bonjour le réseau"), false);
  });

  it("score suspicion avec mentions", () => {
    assert.ok(suspicionScoreForContent("@NeoByte est humain") >= 3);
  });
});

describe("pickRandomNpcPostType", () => {
  it("retourne un type valide", () => {
    const types = new Set<string>();
    for (let i = 0; i < 20; i++) {
      types.add(pickRandomNpcPostType());
    }
    assert.ok(types.has("message") || types.has("theory"));
  });
});
