import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isStrongEmergentSignal,
  priorityForHumanJoined,
  priorityForPost,
  priorityForReaction,
  priorityForReactionSignal,
} from "@/lib/engine/reactive/signal-priority";
import { shouldEmergentNpcPost } from "@/lib/engine/reactive/emergent-response-mode";
import type { NarrativeSignal } from "@/lib/engine/shared/types";

describe("priorityForPost", () => {
  it("retourne une priorité uniforme", () => {
    assert.equal(priorityForPost("message"), 22);
    assert.equal(priorityForPost("theory"), 22);
  });
});

describe("priorityForReaction", () => {
  it("priorise amplify et relay", () => {
    assert.ok(priorityForReaction("amplify") > priorityForReaction("relay"));
    assert.ok(priorityForReaction("relay") > priorityForReaction("flag"));
  });
});

describe("priorityForReactionSignal", () => {
  it("priorise relay faiblement", () => {
    assert.equal(priorityForReactionSignal("relay", "message"), 18);
  });

  it("priorise amplify et flag", () => {
    assert.equal(priorityForReactionSignal("amplify", "message"), 30);
    assert.equal(priorityForReactionSignal("flag", "message"), 28);
  });
});

describe("isStrongEmergentSignal", () => {
  it("détecte human_joined", () => {
    assert.equal(
      isStrongEmergentSignal({ kind: "human_joined", priority: 42 }),
      true
    );
  });

  it("détecte les posts humains", () => {
    assert.equal(
      isStrongEmergentSignal({
        kind: "human_post",
        priority: 22,
        postType: "message",
      }),
      true
    );
    assert.equal(
      isStrongEmergentSignal({
        kind: "human_post",
        priority: 10,
        postType: "message",
      }),
      false
    );
  });
});

describe("priorityForHumanJoined", () => {
  it("priorise la première vague d'accueil", () => {
    assert.equal(priorityForHumanJoined(0), 48);
    assert.ok(priorityForHumanJoined(0) > priorityForPost("message"));
  });
});

describe("shouldEmergentNpcPost", () => {
  it("ne poste pas hors human_post", () => {
    const signal = {
      kind: "mention",
      priority: 45,
      payload: {},
    } as unknown as NarrativeSignal;
    assert.equal(shouldEmergentNpcPost(signal, () => 0), false);
  });

  it("respecte le tirage aléatoire pour human_post", () => {
    const signal = {
      kind: "human_post",
      priority: 40,
      payload: { post_type: "message" },
    } as unknown as NarrativeSignal;
    assert.equal(shouldEmergentNpcPost(signal, () => 0.1), true);
    assert.equal(shouldEmergentNpcPost(signal, () => 0.9), false);
  });

  it("peut poster en réponse à un commentaire", () => {
    const signal = {
      kind: "human_comment",
      priority: 32,
      payload: { post_type: "message" },
    } as unknown as NarrativeSignal;
    assert.equal(shouldEmergentNpcPost(signal, () => 0.1), true);
    assert.equal(shouldEmergentNpcPost(signal, () => 0.25), false);
  });

  it("peut poster après amplify", () => {
    const signal = {
      kind: "reaction",
      reaction_kind: "amplify",
      priority: 34,
      payload: { post_type: "message" },
    } as unknown as NarrativeSignal;
    assert.equal(shouldEmergentNpcPost(signal, () => 0.1), true);
    assert.equal(shouldEmergentNpcPost(signal, () => 0.9), false);
  });
});
