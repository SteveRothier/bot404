import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseSteamStoreSearch,
  steamHeaderUrls,
  extractGameSearchQuery,
} from "@/lib/engine/content/steam-media";

describe("parseSteamStoreSearch", () => {
  it("prend le premier jeu app", () => {
    const item = parseSteamStoreSearch({
      items: [
        { id: 1, type: "app", name: "Half-Life" },
        { id: 2, type: "dlc", name: "DLC" },
      ],
    });
    assert.equal(item?.id, 1);
    assert.equal(item?.name, "Half-Life");
  });

  it("ignore les DLC si un jeu suit", () => {
    const item = parseSteamStoreSearch({
      items: [
        { id: 99, type: "dlc", name: "Extra" },
        { id: 42, type: "game", name: "Portal" },
      ],
    });
    assert.equal(item?.id, 42);
  });

  it("retourne null si vide", () => {
    assert.equal(parseSteamStoreSearch({ items: [] }), null);
    assert.equal(parseSteamStoreSearch(null), null);
  });
});

describe("steamHeaderUrls", () => {
  it("génère les URLs header pour un appid", () => {
    const urls = steamHeaderUrls(570);
    assert.ok(urls[0].includes("/570/"));
    assert.ok(urls.length >= 2);
  });
});

describe("extractGameSearchQuery", () => {
  it("extrait des mots-clés du post", () => {
    const q = extractGameSearchQuery("Nouveau patch meta #gaming demain");
    assert.ok(q.includes("patch") || q.includes("gaming") || q.includes("demain"));
  });
});
