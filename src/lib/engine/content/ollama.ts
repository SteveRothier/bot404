import { getOllamaConfig, type OllamaRuntime } from "@/lib/ollama-config";
import type { OllamaProvider } from "@/lib/ollama-bridge";
import { createStaticOllamaProvider } from "@/lib/ollama-bridge";
import type { PostType } from "@/lib/supabase/types";

const FORBIDDEN = /\b(kill|suicide|nazi)\b/i;

export type OllamaChatProfile = "default" | "signal" | "meme" | "comment";

export const OLLAMA_PROFILE_OPTIONS: Record<
  OllamaChatProfile,
  { temperature: number; top_p: number }
> = {
  default: { temperature: 0.75, top_p: 0.9 },
  signal: { temperature: 0.35, top_p: 0.85 },
  meme: { temperature: 0.95, top_p: 0.95 },
  comment: { temperature: 0.8, top_p: 0.9 },
};

export function ollamaProfileForPostType(postType?: PostType): OllamaChatProfile {
  if (postType === "signal") return "signal";
  if (postType === "message") return "meme";
  return "default";
}

let ollamaCallsThisTick = 0;

export function resetOllamaCallCount(): void {
  ollamaCallsThisTick = 0;
}

export function getOllamaCallCount(): number {
  return ollamaCallsThisTick;
}

export function incrementOllamaCallCount(): void {
  ollamaCallsThisTick += 1;
}

export async function fetchOllamaChat(
  runtime: OllamaRuntime,
  system: string,
  user: string,
  maxChars = 500,
  profile: OllamaChatProfile = "default"
): Promise<string | null> {
  const opts = OLLAMA_PROFILE_OPTIONS[profile];
  const baseUrl = runtime.baseUrl.replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: runtime.model,
      stream: false,
      think: false,
      options: {
        temperature: opts.temperature,
        top_p: opts.top_p,
      },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    message?: { content?: string };
  };
  const text = data?.message?.content?.trim();
  if (!text || FORBIDDEN.test(text)) return null;
  return text.slice(0, maxChars);
}

export function createServerOllamaProvider(
  runtime: OllamaRuntime = getOllamaConfig()
): OllamaProvider {
  return createStaticOllamaProvider(
    runtime,
    async (rt, system, user, maxChars, profile) =>
      fetchOllamaChat(rt, system, user, maxChars, profile),
    incrementOllamaCallCount
  );
}

export async function ollamaChat(
  system: string,
  user: string,
  maxChars = 500,
  profile: OllamaChatProfile = "default",
  provider: OllamaProvider = createServerOllamaProvider()
): Promise<string | null> {
  return provider.chat(system, user, maxChars, profile);
}
