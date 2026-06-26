import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractGifSearchQuery,
  isAllowedGiphyUrl,
  parseGiphyGifItem,
  parseGiphyGifsResponse,
  parseGiphySearchResponse,
} from "@/lib/engine/content/gif-search";

describe("parseGiphySearchResponse", () => {
  it("extrait l'URL du premier GIF", () => {
    const url = parseGiphySearchResponse({
      data: [
        {
          id: "abc123",
          images: {
            downsized_medium: { url: "https://media.giphy.com/gif1.gif" },
            fixed_height_small: { url: "https://media.giphy.com/gif1-sm.gif" },
          },
        },
      ],
    });
    assert.equal(url, "https://media.giphy.com/gif1.gif");
  });

  it("retourne null si vide", () => {
    assert.equal(parseGiphySearchResponse({ data: [] }), null);
  });
});

describe("parseGiphyGifsResponse", () => {
  it("parse une liste de GIFs", () => {
    const results = parseGiphyGifsResponse({
      data: [
        {
          id: "a",
          images: {
            downsized_medium: { url: "https://media.giphy.com/a.gif" },
            fixed_height_small: { url: "https://media.giphy.com/a-sm.gif" },
          },
        },
        {
          id: "b",
          images: {
            original: { url: "https://media.giphy.com/b.gif" },
          },
        },
      ],
    });
    assert.equal(results.length, 2);
    assert.equal(results[0]?.id, "a");
    assert.equal(results[0]?.previewUrl, "https://media.giphy.com/a-sm.gif");
    assert.equal(results[1]?.url, "https://media.giphy.com/b.gif");
  });
});

describe("parseGiphyGifItem", () => {
  it("retourne null sans id", () => {
    assert.equal(
      parseGiphyGifItem({
        images: { original: { url: "https://media.giphy.com/x.gif" } },
      }),
      null
    );
  });
});

describe("isAllowedGiphyUrl", () => {
  it("accepte media.giphy.com", () => {
    assert.equal(
      isAllowedGiphyUrl("https://media.giphy.com/media/abc/giphy.gif"),
      true
    );
  });

  it("rejette les domaines non Giphy", () => {
    assert.equal(isAllowedGiphyUrl("https://example.com/gif.gif"), false);
    assert.equal(isAllowedGiphyUrl("http://media.giphy.com/x.gif"), false);
  });
});

describe("extractGifSearchQuery", () => {
  it("garde des mots courts utiles pour la recherche", () => {
    const q = extractGifSearchQuery("lol wtf le meta est cassé");
    assert.ok(q.includes("meta") || q.includes("cass"));
  });
});
