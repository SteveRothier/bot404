import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fallbackNpcPollOptions,
  parseNpcPollOptionsJson,
  shouldNpcAttachPoll,
} from "@/lib/engine/content/poll-create";
import { validatePollDraft } from "@/lib/polls";

describe("parseNpcPollOptionsJson", () => {
  it("parse un JSON Ollama valide", () => {
    assert.deepEqual(
      parseNpcPollOptionsJson(
        'Voici : {"options":["Alpha","Beta","Gamma"]}'
      ),
      ["Alpha", "Beta", "Gamma"]
    );
  });

  it("rejette un JSON invalide", () => {
    assert.equal(parseNpcPollOptionsJson("pas de json"), null);
    assert.equal(parseNpcPollOptionsJson('{"options":["seul"]}'), null);
  });
});

describe("shouldNpcAttachPoll", () => {
  it("rejette signal et posts avec média", () => {
    assert.equal(
      shouldNpcAttachPoll("signal", false, "ambient", () => 0),
      false
    );
    assert.equal(
      shouldNpcAttachPoll("message", true, "ambient", () => 0),
      false
    );
  });

  it("accepte quand le tirage est sous le seuil", () => {
    assert.equal(
      shouldNpcAttachPoll("message", false, "ambient", () => 0.01),
      true
    );
  });

  it("refuse quand le tirage dépasse le seuil", () => {
    assert.equal(
      shouldNpcAttachPoll("message", false, "ambient", () => 0.99),
      false
    );
  });
});

describe("fallbackNpcPollOptions", () => {
  it("produit un brouillon valide", () => {
    const options = fallbackNpcPollOptions(() => 0);
    assert.equal(validatePollDraft({ options, durationMinutes: 1440 }), null);
  });
});
