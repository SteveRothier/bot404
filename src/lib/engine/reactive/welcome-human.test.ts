import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWelcomePostPrompt,
  pickNpcForWelcomeBeat,
  priorityForHumanJoined,
  scoreNpcForWelcomeBeat,
  usernameFromWelcomeSignal,
  welcomeAmbientPromptBlock,
  welcomeBeatFromPayload,
} from "@/lib/engine/reactive/welcome-human";
import type { NarrativeSignal } from "@/lib/engine/shared/types";
import type { Profile } from "@/lib/supabase/types";

function npc(id: string, username: string): Profile {
  return {
    id,
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

describe("buildWelcomePostPrompt", () => {
  it("mentionne @username dans le prompt system", () => {
    const { system } = buildWelcomePostPrompt(
      npc("1", "GrandmaBot"),
      "Alice",
      "welcome"
    );
    assert.match(system, /@Alice/);
  });

  it("adapte le ton selon le beat", () => {
    const suspicion = buildWelcomePostPrompt(
      npc("2", "ConspiracyBot"),
      "Bob",
      "suspicion"
    );
    assert.match(suspicion.system, /Soupçonne|humain|glitch/i);
  });
});

describe("welcomeBeatFromPayload", () => {
  it("retourne welcome par défaut", () => {
    assert.equal(welcomeBeatFromPayload({}), "welcome");
    assert.equal(welcomeBeatFromPayload({ beat: "rumor" }), "rumor");
  });
});

describe("usernameFromWelcomeSignal", () => {
  it("lit le payload username", () => {
    const signal = {
      payload: { username: "TestUser" },
    } as NarrativeSignal;
    assert.equal(usernameFromWelcomeSignal(signal), "TestUser");
    assert.equal(usernameFromWelcomeSignal({ payload: {} } as NarrativeSignal), "humain");
  });
});

describe("pickNpcForWelcomeBeat", () => {
  it("favorise l'archetype du beat", () => {
    const welcomeNpc = npc("h", "GrandmaBot");
    const other = npc("p", "PatchNotes");
    const picked = pickNpcForWelcomeBeat(
      [other, welcomeNpc],
      "welcome",
      () => 0.01
    );
    assert.equal(picked?.id, welcomeNpc.id);
  });
});

describe("scoreNpcForWelcomeBeat", () => {
  it("score plus élevé pour l'archetype suspicion", () => {
    assert.ok(
      scoreNpcForWelcomeBeat(npc("p", "ConspiracyBot"), "suspicion") >
        scoreNpcForWelcomeBeat(npc("h", "GrandmaBot"), "suspicion")
    );
  });
});

describe("priorityForHumanJoined", () => {
  it("décroît par vague", () => {
    assert.equal(priorityForHumanJoined(0), 48);
    assert.equal(priorityForHumanJoined(1), 46);
    assert.equal(priorityForHumanJoined(2), 44);
    assert.equal(priorityForHumanJoined(3), 42);
  });
});

describe("welcomeAmbientPromptBlock", () => {
  it("mentionne le nouvel humain", () => {
    assert.match(welcomeAmbientPromptBlock("Newbie"), /@Newbie/);
  });
});
