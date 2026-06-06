"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { OllamaStatus } from "@/lib/ollama";
import type { Faction } from "@/lib/supabase/types";
import {
  startFactionsRealtime,
  stopFactionsRealtime,
  useFactionsStore,
} from "@/stores/factions-store";
import {
  startNotificationsRealtime,
  stopNotificationsRealtime,
  useNotificationsStore,
} from "@/stores/notifications-store";
import { useOllamaStore } from "@/stores/ollama-store";

type Props = {
  factions: Faction[];
  ollama: OllamaStatus;
  userId: string | null;
  initialUnreadCount: number;
  children: React.ReactNode;
};

function useFactionsRealtimeEnabled() {
  const pathname = usePathname();
  const [isXl, setIsXl] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsXl(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isXl || pathname.startsWith("/factions");
}

export function ClientStoresHydrator({
  factions,
  ollama,
  userId,
  initialUnreadCount,
  children,
}: Props) {
  const factionsRealtimeEnabled = useFactionsRealtimeEnabled();

  useEffect(() => {
    useFactionsStore.getState().hydrate(factions);
    useNotificationsStore.getState().hydrate(initialUnreadCount);
    if (ollama.model) {
      useOllamaStore.setState({ model: ollama.model });
    }
  }, [factions, ollama.model, initialUnreadCount]);


  useEffect(() => {
    if (factionsRealtimeEnabled) {
      startFactionsRealtime();
    } else {
      stopFactionsRealtime();
    }

    return () => stopFactionsRealtime();
  }, [factionsRealtimeEnabled]);

  useEffect(() => {
    if (!userId) {
      stopNotificationsRealtime();
      return;
    }

    startNotificationsRealtime(userId);
    return () => stopNotificationsRealtime();
  }, [userId]);

  return children;
}
