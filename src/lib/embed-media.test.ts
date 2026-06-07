import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  embedUrlDuplicatesMedia,
  extractEmbedMediaUrls,
  extractTenorPostId,
  getEmbedMediaKind,
  isEmbeddableSourceUrl,
  parseTenorOgMedia,
  stripEmbedUrlsForDisplay,
} from "@/lib/embed-media";

const DISCORD_TENOR_MP4 =
  "https://images-ext-1.discordapp.net/external/8ZWt2i1CpnWytqJ4I1tY-PesdS6TegUBzw_OyWU6JRs/https/media.tenor.com/xCUTS6oTuyQAAAPo/the-burnt-peanut-theburntpeanut.mp4";

const TENOR_VIEW =
  "https://tenor.com/view/bitcoin-staystrong-youcandoit-crypto-bear-gif-23588652";

const TENOR_VIEW_LONG_ID =
  "https://tenor.com/view/dol-huh-eyes-disgusted-gif-11690827820922534530";

const DISCORD_MP4 =
  "https://cdn.discordapp.com/attachments/1172762919306547230/1513297932936548602/didnt_hear_no_bell.mp4?ex=abc";

const TENOR_OG_HTML = `
<meta property="og:image" content="https://media.tenor.com/foo/preview.gif" />
<meta property="og:video:secure_url" content="https://media.tenor.com/foo/clip.mp4" />
<meta property="og:video" content="https://media.tenor.com/foo/clip.mp4" />
`;

describe("getEmbedMediaKind", () => {
  it("détecte mp4 Discord/Tenor", () => {
    assert.equal(getEmbedMediaKind(DISCORD_TENOR_MP4), "mp4");
  });

  it("détecte gif direct", () => {
    assert.equal(
      getEmbedMediaKind("https://media.giphy.com/media/abc/giphy.gif"),
      "gif"
    );
  });

  it("détecte mp4 Discord CDN", () => {
    assert.equal(getEmbedMediaKind(DISCORD_MP4), "mp4");
  });

  it("ignore les URLs non média", () => {
    assert.equal(getEmbedMediaKind("https://example.com/page"), null);
  });
});

describe("extractEmbedMediaUrls", () => {
  it("extrait la première URL embeddable", () => {
    const urls = extractEmbedMediaUrls(
      `Regardez ${DISCORD_TENOR_MP4} et aussi https://media.giphy.com/media/x/giphy.gif`
    );
    assert.equal(urls.length, 1);
    assert.equal(urls[0], DISCORD_TENOR_MP4);
  });

  it("retire la ponctuation finale", () => {
    const urls = extractEmbedMediaUrls(`${DISCORD_TENOR_MP4}.`);
    assert.equal(urls[0], DISCORD_TENOR_MP4);
  });

  it("accepte les pages Tenor /view/", () => {
    assert.equal(isEmbeddableSourceUrl(TENOR_VIEW), true);
    assert.deepEqual(extractEmbedMediaUrls(TENOR_VIEW), [TENOR_VIEW]);
    assert.equal(extractTenorPostId(TENOR_VIEW), "23588652");
    assert.equal(extractTenorPostId(TENOR_VIEW_LONG_ID), "11690827820922534530");
  });

  it("retire l'URL embed du texte affiché", () => {
    assert.equal(
      stripEmbedUrlsForDisplay(`Salut ${DISCORD_MP4} !!`),
      "Salut !!"
    );
    assert.equal(stripEmbedUrlsForDisplay(DISCORD_MP4), "");
  });
});

describe("parseTenorOgMedia", () => {
  it("priorise og:video:secure_url (mp4 animé)", () => {
    const parsed = parseTenorOgMedia(TENOR_OG_HTML);
    assert.ok(parsed);
    assert.equal(parsed?.kind, "mp4");
    assert.equal(parsed?.url, "https://media.tenor.com/foo/clip.mp4");
  });

  it("utilise og:image gif si pas de vidéo", () => {
    const parsed = parseTenorOgMedia(
      '<meta property="og:image" content="https://media.tenor.com/foo/anim.gif" />'
    );
    assert.ok(parsed);
    assert.equal(parsed?.kind, "gif");
  });
});

describe("embedUrlDuplicatesMedia", () => {
  it("détecte les URLs identiques ou contenues", () => {
    assert.equal(
      embedUrlDuplicatesMedia("https://a.com/x.gif", "https://a.com/x.gif"),
      true
    );
    assert.equal(
      embedUrlDuplicatesMedia(
        DISCORD_TENOR_MP4,
        "https://media.tenor.com/xCUTS6oTuyQAAAPo/the-burnt-peanut-theburntpeanut.mp4"
      ),
      true
    );
  });
});
