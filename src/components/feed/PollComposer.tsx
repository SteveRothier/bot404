"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  POLL_LABEL_MAX,
  POLL_MAX_OPTIONS,
  POLL_MIN_DURATION_MINUTES,
  POLL_MIN_OPTIONS,
  pollDurationFromParts,
  type PollDraftInput,
} from "@/lib/polls";
import { cn } from "@/lib/utils";

export type PollDraftState = PollDraftInput & {
  optionFields: string[];
};

export function createDefaultPollDraft(): PollDraftState {
  return {
    options: ["", ""],
    optionFields: ["", ""],
    durationMinutes: pollDurationFromParts(1, 0, 0),
  };
}

type Props = {
  draft: PollDraftState;
  onChange: (draft: PollDraftState) => void;
  onRemove: () => void;
  disabled?: boolean;
};

export function PollComposer({ draft, onChange, onRemove, disabled }: Props) {
  const baseId = useId();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const days = Math.floor(draft.durationMinutes / (24 * 60));
  const hours = Math.floor((draft.durationMinutes % (24 * 60)) / 60);
  const minutes = draft.durationMinutes % 60;
  const canRemoveChoice = draft.optionFields.length > POLL_MIN_OPTIONS;

  function syncOptions(fields: string[]) {
    onChange({
      ...draft,
      optionFields: fields,
      options: fields.map((f) => f.trim()).filter(Boolean),
    });
  }

  function updateOption(index: number, value: string) {
    const next = [...draft.optionFields];
    next[index] = value.slice(0, POLL_LABEL_MAX);
    syncOptions(next);
  }

  function addOption() {
    if (draft.optionFields.length >= POLL_MAX_OPTIONS) return;
    syncOptions([...draft.optionFields, ""]);
  }

  function removeOption(index: number) {
    if (draft.optionFields.length <= POLL_MIN_OPTIONS) return;
    const next = draft.optionFields.filter((_, i) => i !== index);
    syncOptions(next);
    setFocusedIndex(null);
  }

  function setDuration(d: number, h: number, m: number) {
    onChange({
      ...draft,
      durationMinutes: pollDurationFromParts(
        Math.min(7, Math.max(0, d)),
        Math.min(23, Math.max(0, h)),
        Math.min(59, Math.max(0, m))
      ),
    });
  }

  function parseDurationInput(raw: string, max: number): number {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return 0;
    return Math.min(max, parseInt(digits, 10));
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-secondary/30">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="text-sm font-medium text-foreground">Sondage</span>
        <span className="text-xs text-muted-foreground">
          {draft.optionFields.length}/{POLL_MAX_OPTIONS} choix
        </span>
      </div>

      <div className="space-y-2 p-3">
        {draft.optionFields.map((value, index) => {
          const isFocused = focusedIndex === index;
          return (
            <div key={`${baseId}-${index}`} className="flex items-center gap-1.5">
              <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  value={value}
                  disabled={disabled}
                  maxLength={POLL_LABEL_MAX}
                  placeholder={`Choix ${index + 1}`}
                  onChange={(e) => updateOption(index, e.target.value)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  className={cn(
                    "w-full rounded-lg border bg-background px-3 py-2.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-accent focus:outline-none disabled:opacity-60",
                    isFocused ? "border-accent" : "border-border"
                  )}
                />
                <span
                  className={cn(
                    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums",
                    isFocused || value.length > 20
                      ? "text-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {value.length}/{POLL_LABEL_MAX}
                </span>
              </div>
              {canRemoveChoice && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeOption(index)}
                  aria-label={`Retirer le choix ${index + 1}`}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              )}
            </div>
          );
        })}

        {draft.optionFields.length < POLL_MAX_OPTIONS && (
          <button
            type="button"
            disabled={disabled}
            onClick={addOption}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-foreground disabled:opacity-60"
          >
            <Plus className="size-4" strokeWidth={2} />
            Ajouter un choix
          </button>
        )}
      </div>

      <div className="border-t border-border/60 px-3 py-3">
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Durée
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["Jours", days, 7, (v: number) => setDuration(v, hours, minutes)],
              ["Heures", hours, 23, (v: number) => setDuration(days, v, minutes)],
              ["Min.", minutes, 59, (v: number) => setDuration(days, hours, v)],
            ] as const
          ).map(([label, val, max, onUpdate]) => (
            <label
              key={label}
              className="flex flex-col gap-1.5 text-xs text-muted-foreground"
            >
              {label}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={disabled}
                value={String(val)}
                onChange={(e) => onUpdate(parseDurationInput(e.target.value, max))}
                className="w-full rounded-full border border-border bg-background px-3 py-2 text-center text-sm tabular-nums text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {draft.durationMinutes < POLL_MIN_DURATION_MINUTES
            ? `Durée minimum : ${POLL_MIN_DURATION_MINUTES} min`
            : `${POLL_MIN_OPTIONS} choix minimum requis`}
        </p>
      </div>

      <div className="border-t border-border/60 px-3 py-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="text-sm text-destructive transition-colors hover:text-destructive/80 disabled:opacity-60"
        >
          Retirer le sondage
        </button>
      </div>
    </div>
  );
}
