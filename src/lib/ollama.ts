export type OllamaStatus = {
  online: boolean;
  model: string;
};

export {
  NPC_COMMENT_INTERVAL_MINUTES,
  NPC_POST_INTERVAL_MINUTES,
} from "@/lib/npc-schedule";

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  const baseUrl = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen3.5:4b";

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
