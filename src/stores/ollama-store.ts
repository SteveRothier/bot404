import { create } from "zustand";
import type { OllamaStatus } from "@/lib/ollama";

type OllamaState = {
  online: boolean;
  model: string;
  hydrate: (status: OllamaStatus) => void;
  refresh: () => Promise<boolean>;
  startPolling: () => void;
  stopPolling: () => void;
};

let pollingId: number | null = null;

async function fetchOllamaStatus(): Promise<OllamaStatus> {
  try {
    const res = await fetch("/api/ollama-status");
    const data = (await res.json()) as { online: boolean; model?: string };
    return {
      online: data.online,
      model: data.model ?? useOllamaStore.getState().model,
    };
  } catch {
    return { online: false, model: useOllamaStore.getState().model };
  }
}

export const useOllamaStore = create<OllamaState>((set, get) => ({
  online: false,
  model: "",
  hydrate: (status) => set({ online: status.online, model: status.model }),
  refresh: async () => {
    const status = await fetchOllamaStatus();
    set({ online: status.online, model: status.model });
    return status.online;
  },
  startPolling: () => {
    if (pollingId !== null) return;
    pollingId = window.setInterval(() => {
      void get().refresh();
    }, 30_000);
  },
  stopPolling: () => {
    if (pollingId === null) return;
    window.clearInterval(pollingId);
    pollingId = null;
  },
}));
