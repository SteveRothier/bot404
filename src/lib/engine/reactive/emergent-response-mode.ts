import { isStrongEmergentSignal } from "@/lib/engine/reactive/signal-priority";
import type { NarrativeSignal } from "@/lib/engine/shared/types";

/** Probabilité de post NPC vs commentaire pour signaux émergents. */
export function shouldEmergentNpcPost(
  signal: NarrativeSignal,
  random = Math.random
): boolean {
  if (signal.kind === "human_post") {
    if (
      !isStrongEmergentSignal({
        kind: signal.kind,
        priority: signal.priority,
      })
    ) {
      return false;
    }
    return random() < 0.35;
  }

  if (signal.kind === "human_comment") {
    return random() < 0.2;
  }

  if (signal.kind === "reaction") {
    const reaction = signal.reaction_kind;
    if (reaction === "amplify") {
      return random() < 0.3;
    }
    if (reaction === "flag") {
      return random() < 0.25;
    }
    return false;
  }

  return false;
}
