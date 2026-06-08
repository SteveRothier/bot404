import { getOllamaConfig } from "@/lib/ollama-config";

export type OllamaStatus = {
  online: boolean;
  model: string;
};

export function getDefaultOllamaStatus(): OllamaStatus {
  const { model } = getOllamaConfig();
  return { online: false, model };
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  const { baseUrl, model } = getOllamaConfig();

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!response.ok) return { online: false, model };
    return { online: true, model };
  } catch {
    return { online: false, model };
  }
}
