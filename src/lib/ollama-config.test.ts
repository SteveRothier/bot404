import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getOllamaDisplayDefaults,
  normalizeOllamaEndpointUrl,
  OLLAMA_ENDPOINT_STORAGE_KEY,
  resolveOllamaRuntime,
} from "@/lib/ollama-config";

describe("normalizeOllamaEndpointUrl", () => {
  it("accepte une URL http valide", () => {
    assert.equal(
      normalizeOllamaEndpointUrl("http://127.0.0.1:11434"),
      "http://127.0.0.1:11434"
    );
  });

  it("accepte https et retire le slash final", () => {
    assert.equal(
      normalizeOllamaEndpointUrl("  https://ollama.example.com/  "),
      "https://ollama.example.com"
    );
  });

  it("rejette une chaîne vide", () => {
    assert.equal(normalizeOllamaEndpointUrl(""), null);
    assert.equal(normalizeOllamaEndpointUrl("   "), null);
  });

  it("rejette une URL sans schéma http(s)", () => {
    assert.equal(normalizeOllamaEndpointUrl("127.0.0.1:11434"), null);
    assert.equal(normalizeOllamaEndpointUrl("ftp://127.0.0.1:11434"), null);
  });
});

describe("getOllamaDisplayDefaults", () => {
  it("expose la clé localStorage", () => {
    assert.equal(OLLAMA_ENDPOINT_STORAGE_KEY, "bot404-ollama-endpoint");
  });

  it("retourne endpointUrl et model", () => {
    const defaults = getOllamaDisplayDefaults();
    assert.match(defaults.endpointUrl, /^https?:\/\//);
    assert.ok(defaults.model.length > 0);
  });
});

describe("resolveOllamaRuntime", () => {
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    delete process.env.VERCEL;
  });

  afterEach(() => {
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  it("normalise un override", () => {
    const runtime = resolveOllamaRuntime({
      endpointUrl: "https://ollama.example.com/",
      model: "test-model",
    });
    assert.ok(runtime);
    assert.equal(runtime.baseUrl, "https://ollama.example.com");
    assert.equal(runtime.model, "test-model");
    assert.equal(runtime.serverReachable, true);
  });

  it("marque localhost injoignable côté serveur sur Vercel", () => {
    process.env.VERCEL = "1";
    const runtime = resolveOllamaRuntime({
      endpointUrl: "http://127.0.0.1:11434",
    });
    assert.ok(runtime);
    assert.equal(runtime.serverReachable, false);
  });

  it("autorise localhost côté serveur hors Vercel", () => {
    const runtime = resolveOllamaRuntime({
      endpointUrl: "http://127.0.0.1:11434",
    });
    assert.ok(runtime);
    assert.equal(runtime.serverReachable, true);
  });
});
