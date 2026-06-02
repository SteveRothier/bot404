"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSearch } from "lucide-react";
import {
  getOpenInvestigationsForPicker,
  linkPostToInvestigation,
} from "@/app/actions/investigations";
import { Button } from "@/components/ui/button";

type Props = {
  postId: number;
  isLoggedIn: boolean;
};

export function AddPostToDossier({ postId, isLoggedIn }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [investigations, setInvestigations] = useState<
    { id: number; title: string }[]
  >([]);
  const [investigationId, setInvestigationId] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoadingList(true);
    getOpenInvestigationsForPicker()
      .then((list) => {
        setInvestigations(list);
        setInvestigationId(list[0]?.id ?? 0);
      })
      .finally(() => setLoadingList(false));
  }, [open]);

  if (!isLoggedIn) return null;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await linkPostToInvestigation(postId, investigationId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
      >
        <FileSearch className="size-4" strokeWidth={1.75} />
        Ajouter à un dossier
      </button>
    );
  }

  if (loadingList) {
    return (
      <p className="mt-2 text-meta text-muted-foreground">Chargement des dossiers…</p>
    );
  }

  if (investigations.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Aucun dossier ouvert.{" "}
        <a href="/dossiers" className="text-accent hover:underline">
          Ouvrir un dossier
        </a>
      </p>
    );
  }

  return (
    <div
      className="mt-2 rounded-lg border border-border bg-secondary/40 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-meta font-medium text-foreground">Lier à un dossier</p>
      <select
        value={investigationId}
        onChange={(e) => setInvestigationId(Number(e.target.value))}
        className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
      >
        {investigations.map((inv) => (
          <option key={inv.id} value={inv.id}>
            {inv.title}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-meta text-destructive">{error}</p>}
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleSubmit}
        >
          {pending ? "…" : "Confirmer"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
