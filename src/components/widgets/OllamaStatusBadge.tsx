"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  initialOnline: boolean;
  initialModel: string;
};

export function OllamaStatusBadge({ initialOnline, initialModel }: Props) {
  const [online, setOnline] = useState(initialOnline);
  const [model, setModel] = useState(initialModel);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/ollama-status");
        const data = (await res.json()) as { online: boolean; model?: string };
        setOnline(data.online);
        if (data.model) setModel(data.model);
      } catch {
        setOnline(false);
      }
    }

    check();
    const id = window.setInterval(check, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <span className="text-sm text-[#9ca3af]">IA locale (Ollama)</span>
        <p className="truncate text-[11px] text-[#6b7280]">{model}</p>
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1.5 font-mono text-sm font-semibold",
          online ? "text-emerald-400" : "text-[#fda4af]"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-[#fda4af]"
          )}
        />
        {online ? "Allumée" : "Éteinte"}
      </span>
    </div>
  );
}
