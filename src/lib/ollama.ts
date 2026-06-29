import {
  getOllamaConfig,
  getOllamaDisplayDefaults,
  getPublicOllamaModel,
  isLocalOllamaUrl,
  type OllamaRuntime,
} from "@/lib/ollama-config";

export type OllamaStatus = {
  online: boolean;
  model: string;
  /** Ollama sur localhost — le serveur Vercel ne peut pas le joindre. */
  localOnly?: boolean;
};

export function getDefaultOllamaStatus(): OllamaStatus {
  const { model } = getOllamaDisplayDefaults();
  return { online: false, model };
}

export async function pingOllamaUrl(
  baseUrl: string,
  timeoutMs = 3000
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Vérification côté serveur (API route, scripts Node). */
export async function checkOllamaStatus(
  runtime?: OllamaRuntime | null
): Promise<OllamaStatus> {
  const resolved = runtime ?? getOllamaConfig();
  const { baseUrl, model } = resolved;
  const localOnly = isLocalOllamaUrl(baseUrl);

  if (localOnly && process.env.VERCEL) {
    return { online: false, model, localOnly: true };
  }

  const online = await pingOllamaUrl(baseUrl);
  return { online, model, localOnly: localOnly && !online ? true : undefined };
}

/** Vérification côté navigateur (URL éditable ou défaut env). */
export async function checkOllamaStatusClient(
  fallbackModel: string,
  endpointUrl?: string
): Promise<OllamaStatus> {
  const publicModel = getPublicOllamaModel();
  const model = publicModel ?? fallbackModel;

  if (endpointUrl) {
    const online = await pingOllamaUrl(endpointUrl);
    const local = isLocalOllamaUrl(endpointUrl);
    return {
      online,
      model,
      localOnly: !online && local ? true : undefined,
    };
  }

  try {
    const res = await fetch("/api/ollama-status");
    const data = (await res.json()) as OllamaStatus;
    return {
      online: data.online,
      model: data.model ?? model,
      localOnly: data.localOnly,
    };
  } catch {
    return { online: false, model, localOnly: true };
  }
}
