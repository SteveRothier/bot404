import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  avatarFallbackSeed,
  dicebearAvatarUrl,
  isDiscordAvatarUrl,
  isExternalAvatarUrl,
  normalizeAvatarUrlForSave,
  resolveAvatarUrl,
} from "@/lib/avatars";

describe("resolveAvatarUrl", () => {
  it("utilise Dicebear PNG si URL vide", () => {
    assert.equal(
      resolveAvatarUrl(null, "user-123"),
      dicebearAvatarUrl("user-123")
    );
    assert.equal(
      resolveAvatarUrl("  ", "user-123"),
      dicebearAvatarUrl("user-123")
    );
  });

  it("convertit Dicebear SVG en PNG", () => {
    assert.equal(
      resolveAvatarUrl(
        "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=abc",
        "fallback"
      ),
      dicebearAvatarUrl("abc")
    );
  });

  it("convertit un SVG externe en Dicebear PNG", () => {
    assert.equal(
      resolveAvatarUrl("https://example.com/avatar.svg", "user-123"),
      dicebearAvatarUrl("user-123")
    );
  });

  it("conserve les URLs custom non-SVG", () => {
    const custom = "https://example.com/avatar.jpg";
    assert.equal(resolveAvatarUrl(custom, "x"), custom);
  });
});

describe("isDiscordAvatarUrl", () => {
  it("détecte media.discordapp.net", () => {
    assert.equal(
      isDiscordAvatarUrl(
        "https://media.discordapp.net/attachments/1/2/file.png?ex=abc"
      ),
      true
    );
  });

  it("ignore les autres domaines", () => {
    assert.equal(isDiscordAvatarUrl("https://example.com/a.png"), false);
  });
});

describe("isExternalAvatarUrl", () => {
  it("détecte les URLs hors Dicebear", () => {
    assert.equal(isExternalAvatarUrl("https://example.com/a.png"), true);
    assert.equal(
      isExternalAvatarUrl("https://api.dicebear.com/9.x/bottts-neutral/png?seed=x"),
      false
    );
  });
});

describe("avatarFallbackSeed", () => {
  it("utilise id pour les humains", () => {
    assert.equal(
      avatarFallbackSeed({
        id: "uuid-1",
        username: "Bot404",
        is_npc: false,
      }),
      "uuid-1"
    );
  });

  it("utilise username pour les NPC", () => {
    assert.equal(
      avatarFallbackSeed({
        id: "11111111-1111-1111-1111-111111111101",
        username: "NeoByte",
        is_npc: true,
      }),
      "NeoByte"
    );
  });
});

describe("normalizeAvatarUrlForSave", () => {
  it("retourne null si URL vide", () => {
    assert.equal(normalizeAvatarUrlForSave("", "x"), null);
    assert.equal(normalizeAvatarUrlForSave("  ", "x"), null);
  });

  it("convertit SVG Dicebear en PNG", () => {
    assert.equal(
      normalizeAvatarUrlForSave(
        "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=abc",
        "fallback"
      ),
      dicebearAvatarUrl("abc")
    );
  });
});
