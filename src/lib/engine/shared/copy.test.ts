import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatPendingInteractions } from "@/lib/engine/shared/copy";

describe("formatPendingInteractions", () => {
  it("gère zéro, un et plusieurs", () => {
    assert.match(
      formatPendingInteractions(0),
      /Aucune interaction en attente/
    );
    assert.equal(formatPendingInteractions(1), "1 interaction en attente");
    assert.equal(formatPendingInteractions(3), "3 interactions en attente");
  });
});
