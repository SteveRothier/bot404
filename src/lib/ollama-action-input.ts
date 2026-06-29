import type { OllamaOverride } from "@/lib/ollama-config";

export type ActionOllamaInput = OllamaOverride | undefined;

export function ollamaInputFromStore(
  endpointUrl: string,
  model: string
): OllamaOverride | undefined {
  if (!endpointUrl.trim()) return undefined;
  return { endpointUrl, model: model || undefined };
}
