import type { OllamaChatProfile } from "@/lib/engine/content/ollama";
import type { OllamaRuntime } from "@/lib/ollama-config";

export type OllamaChatRequest = {
  system: string;
  user: string;
  maxChars: number;
  profile: OllamaChatProfile;
};

export class OllamaSuspendError extends Error {
  readonly call: OllamaChatRequest;
  readonly callIndex: number;

  constructor(call: OllamaChatRequest, callIndex: number) {
    super("OLLAMA_SUSPEND");
    this.name = "OllamaSuspendError";
    this.call = call;
    this.callIndex = callIndex;
  }
}

export type OllamaProvider = {
  chat: (
    system: string,
    user: string,
    maxChars?: number,
    profile?: OllamaChatProfile
  ) => Promise<string | null>;
};

export function createQueuedOllamaProvider(
  responses: (string | null)[],
  callIndexRef: { current: number },
  onCall?: () => void
): OllamaProvider {
  return {
    async chat(system, user, maxChars = 500, profile = "default") {
      onCall?.();
      const idx = callIndexRef.current;
      if (idx < responses.length) {
        callIndexRef.current += 1;
        return responses[idx];
      }
      throw new OllamaSuspendError(
        { system, user, maxChars, profile },
        idx
      );
    },
  };
}

export function createStaticOllamaProvider(
  runtime: OllamaRuntime,
  chatFn: (
    runtime: OllamaRuntime,
    system: string,
    user: string,
    maxChars: number,
    profile: OllamaChatProfile
  ) => Promise<string | null>,
  onCall?: () => void
): OllamaProvider {
  return {
    async chat(system, user, maxChars = 500, profile = "default") {
      onCall?.();
      return chatFn(runtime, system, user, maxChars, profile);
    },
  };
}
