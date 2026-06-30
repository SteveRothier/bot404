import { create } from "zustand";
import { checkOllamaStatusClient, type OllamaStatus } from "@/lib/ollama";

type OllamaState = {
  online: boolean;
  model: string;
  localOnly: boolean;
  endpointUrl: string;
  initialized: boolean;
  hydrate: (status: OllamaStatus) => void;
  initEndpoint: (defaultUrl: string, defaultModel: string) => void;
  refresh: () => Promise<boolean>;
  startPolling: () => void;
  stopPolling: () => void;
};

let pollingId: number | null = null;

export const useOllamaStore = create<OllamaState>((set, get) => ({
  online: false,
  model: "",
  localOnly: false,
  endpointUrl: "",
  initialized: false,
  hydrate: (status) =>
    set({
      online: status.online,
      model: status.model,
      localOnly: status.localOnly ?? false,
    }),
  initEndpoint: (defaultUrl, defaultModel) => {
    const endpointUrl = defaultUrl.trim();
    const changed =
      !get().initialized ||
      get().endpointUrl !== endpointUrl ||
      get().model !== (defaultModel || get().model);

    set({
      endpointUrl,
      model: defaultModel || get().model,
      initialized: true,
    });

    if (changed) {
      void get().refresh();
    }
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
