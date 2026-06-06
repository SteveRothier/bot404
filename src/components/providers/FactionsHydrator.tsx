"use client";

import { useEffect } from "react";
import type { Faction } from "@/lib/supabase/types";
import { useFactionsStore } from "@/stores/factions-store";

type Props = {
  factions: Faction[];
};

export function FactionsHydrator({ factions }: Props) {
  useEffect(() => {
    useFactionsStore.getState().hydrate(factions);
  }, [factions]);

  return null;
}
