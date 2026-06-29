import { create } from "zustand";
import {
  normalizeOllamaEndpointUrl,
  OLLAMA_ENDPOINT_STORAGE_KEY,
} from "@/lib/ollama-config";
import { checkOllamaStatusClient, type OllamaStatus } from "@/lib/ollama";

type OllamaState = {
  online: boolean;
  model: string;
  localOnly: boolean;
  endpointUrl: string;
  defaultEndpointUrl: string;
  initialized: boolean;
  hydrate: (status: OllamaStatus) => void;
  initEndpoint: (defaultUrl: string, defaultModel: string) => void;
  setEndpointUrl: (url: string) => boolean;
  resetEndpointUrl: () => void;
  refresh: () => Promise<boolean>;
  startPolling: () => void;
  stopPolling: () => void;
};

let pollingId: number | null = null;

function readStoredEndpoint(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(OLLAMA_ENDPOINT_STORAGE_KEY);
  if (!stored) return fallback;
  return normalizeOllamaEndpointUrl(stored) ?? fallback;
}

export const useOllamaStore = create<OllamaState>((set, get) => ({
  online: false,
  model: "",
  localOnly: false,
  endpointUrl: "",
  defaultEndpointUrl: "",
  initialized: false,
  hydrate: (status) =>
    set({
      online: status.online,
      model: status.model,
      localOnly: status.localOnly ?? false,
    }),
  initEndpoint: (defaultUrl, defaultModel) => {
    const endpointUrl = get().initialized
      ? get().endpointUrl
      : readStoredEndpoint(defaultUrl);

    set({
      defaultEndpointUrl: defaultUrl,
      endpointUrl,
      model: defaultModel || get().model,
      initialized: true,
    });

    void get().refresh();
  },
  setEndpointUrl: (url) => {
    const normalized = normalizeOllamaEndpointUrl(url);
    if (!normalized) return false;

    if (typeof window !== "undefined") {
      localStorage.setItem(OLLAMA_ENDPOINT_STORAGE_KEY, normalized);
    }

    set({ endpointUrl: normalized });
    void get().refresh();
    return true;
  },
  resetEndpointUrl: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(OLLAMA_ENDPOINT_STORAGE_KEY);
    }

    const defaultUrl = get().defaultEndpointUrl;
    set({ endpointUrl: defaultUrl });
    void get().refresh();
  },
  refresh: async () => {
    const { endpointUrl, model } = get();
    const status = await checkOllamaStatusClient(
      model,
      endpointUrl || undefined
    );
    set({
      online: status.online,
      model: status.model,
      localOnly: status.localOnly ?? false,
    });
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
