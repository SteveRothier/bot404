const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "qwen3.5:4b";

export type OllamaDisplayDefaults = {
  endpointUrl: string;
  model: string;
};

export type OllamaRuntime = {
  baseUrl: string;
  model: string;
};

export type ResolvedOllamaRuntime = OllamaRuntime & {
  serverReachable: boolean;
};

export type OllamaOverride = {
  endpointUrl: string;
  model?: string;
};

export function getOllamaConfig(): OllamaRuntime {
  return {
    baseUrl: process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_URL,
    model: process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
  };
}

export function getOllamaDisplayDefaults(): OllamaDisplayDefaults {
  const publicUrl = getPublicOllamaUrl();
  const publicModel = getPublicOllamaModel();
  const { baseUrl, model } = getOllamaConfig();

  return {
    endpointUrl: publicUrl ?? baseUrl,
    model: publicModel ?? model,
  };
}

export function normalizeOllamaEndpointUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return trimmed.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isLocalOllamaUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "::1"
    );
  } catch {
    return false;
  }
}

export function isServerLocalhostBlocked(baseUrl: string): boolean {
  return Boolean(process.env.VERCEL) && isLocalOllamaUrl(baseUrl);
}

export function resolveOllamaRuntime(
  override?: OllamaOverride | null
): ResolvedOllamaRuntime | null {
  const defaults = getOllamaDisplayDefaults();
  const rawUrl = override?.endpointUrl?.trim() || defaults.endpointUrl;
  const baseUrl = normalizeOllamaEndpointUrl(rawUrl);
  if (!baseUrl) return null;

  const model =
    override?.model?.trim() ||
    getPublicOllamaModel() ||
    defaults.model ||
    DEFAULT_OLLAMA_MODEL;

  const serverReachable = !isServerLocalhostBlocked(baseUrl);

  return { baseUrl, model, serverReachable };
}

/** URL pingée depuis le navigateur (Vercel + ollama sur le même PC). */
export function getPublicOllamaUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_OLLAMA_URL?.trim();
  return url || null;
}

export function getPublicOllamaModel(): string | null {
  const model = process.env.NEXT_PUBLIC_OLLAMA_MODEL?.trim();
  return model || null;
}
