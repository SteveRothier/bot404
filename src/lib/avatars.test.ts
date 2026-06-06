import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dicebearAvatarUrl, resolveAvatarUrl } from "@/lib/avatars";

describe("resolveAvatarUrl", () => {
  it("utilise Dicebear PNG si URL vide", () => {
    assert.equal(
      resolveAvatarUrl(null, "user-123"),
      dicebearAvatarUrl("user-123")
    );
    assert.equal(resolveAvatarUrl("  ", "user-123"), dicebearAvatarUrl("user-123"));
  });

  it("convertit Dicebear SVG en PNG", () => {
    assert.equal(
      resolveAvatarUrl(
        "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=abc",
        "fallback"
      ),
      "https://api.dicebear.com/9.x/bottts-neutral/png?seed=abc"
    );
  });

  it("conserve les URLs custom", () => {
    const custom = "https://example.com/avatar.jpg";
    assert.equal(resolveAvatarUrl(custom, "x"), custom);
  });
});
