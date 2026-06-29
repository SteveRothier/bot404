import { createServerOllamaProvider } from "@/lib/engine/content/ollama";
import { checkOllamaStatus } from "@/lib/ollama";
import type { OllamaProvider } from "@/lib/ollama-bridge";
import {
  resolveOllamaRuntime,
  type OllamaOverride,
  type OllamaRuntime,
  type ResolvedOllamaRuntime,
} from "@/lib/ollama-config";

export type OllamaActionContext =
  | {
      ok: true;
      runtime: ResolvedOllamaRuntime;
      provider: OllamaProvider;
      clientBridge: false;
    }
  | {
      ok: true;
      runtime: ResolvedOllamaRuntime;
      clientBridge: true;
    }
  | { ok: false; error: string };

export async function resolveOllamaActionContext(
  override?: OllamaOverride | null
): Promise<OllamaActionContext> {
  const runtime = resolveOllamaRuntime(override);
  if (!runtime) {
    return { ok: false, error: "URL Ollama invalide." };
  }

  if (!runtime.serverReachable) {
    return { ok: true, runtime, clientBridge: true };
  }

  const status = await checkOllamaStatus(runtime);
  if (!status.online) {
    return {
      ok: false,
      error: "Ollama est hors ligne. Lancez ollama serve puis réessayez.",
    };
  }

  return {
    ok: true,
    runtime,
    provider: createServerOllamaProvider(runtime),
    clientBridge: false,
  };
}

export function runtimeFromResolved(resolved: OllamaRuntime): OllamaRuntime {
  return { baseUrl: resolved.baseUrl, model: resolved.model };
}
