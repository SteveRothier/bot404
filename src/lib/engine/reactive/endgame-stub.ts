export type EndgameResult =
  | { triggered: false }
  | { triggered: true; slug: string; title: string };

export async function checkNarrativeEndgame(): Promise<EndgameResult> {
  return { triggered: false };
}
