"use client";

import {
  fetchOllamaChat,
  type OllamaChatProfile,
} from "@/lib/engine/content/ollama";
import {
  isLocalOllamaUrl,
  type OllamaRuntime,
} from "@/lib/ollama-config";

export async function ollamaChatClient(
  runtime: OllamaRuntime,
  system: string,
  user: string,
  maxChars = 500,
  profile: OllamaChatProfile = "default"
): Promise<string | null> {
  return fetchOllamaChat(runtime, system, user, maxChars, profile);
}

export function isBrowserLocalOllamaMode(
  endpointUrl: string,
  online: boolean
): boolean {
  if (typeof window === "undefined") return false;
  if (!online || !isLocalOllamaUrl(endpointUrl)) return false;

  const host = window.location.hostname.toLowerCase();
  const onLocalDev = host === "localhost" || host === "127.0.0.1";
  return !onLocalDev;
}

export function isMixedContentOllamaUrl(endpointUrl: string): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.protocol !== "https:") return false;
  try {
    const parsed = new URL(endpointUrl);
    if (parsed.protocol !== "http:") return false;
    return !isLocalOllamaUrl(endpointUrl);
  } catch {
    return false;
  }
}

export type ClientOllamaSelection = {
  endpointUrl: string;
  model: string;
};

export function getClientOllamaSelection(
  endpointUrl: string,
  model: string,
  defaultModel: string
): ClientOllamaSelection {
  return {
    endpointUrl,
    model: model || defaultModel,
  };
}

export function toOllamaRuntime(selection: ClientOllamaSelection): OllamaRuntime {
  return {
    baseUrl: selection.endpointUrl,
    model: selection.model,
  };
}

export function needsClientOllamaBridge(
  endpointUrl: string,
  online: boolean
): boolean {
  if (typeof window === "undefined" || !online) return false;

  const host = window.location.hostname.toLowerCase();
  const onLocalDev = host === "localhost" || host === "127.0.0.1";
  if (onLocalDev) return false;

  const url = endpointUrl.trim() || "http://127.0.0.1:11434";
  return isLocalOllamaUrl(url);
}

export function effectiveOllamaEndpoint(endpointUrl: string): string {
  return endpointUrl.trim() || "http://127.0.0.1:11434";
}
