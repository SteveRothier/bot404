/** Libellés joueur — source unique pour le feed et les notifications. */

export const NARRATIVE_COPY = {
  inactive: "Aucune histoire active pour le moment.",
  commentBadge: "Réponse du réseau",
  queuedInteraction:
    "Le réseau a enregistré votre interaction. Une réponse de bot peut arriver dans la minute.",
  queuedComment:
    "Commentaire enregistré — un bot peut répondre sur ce fil dans la minute.",
  interactionKind: {
    post: "post",
    comment: "commentaire",
  },
  viewPostLink: "Voir le post →",
  viewThreadLink: "Voir le fil →",
  viewYourPostLink: "Votre post →",
  emergentPostContext: (human: string) =>
    `En réponse à l'activité de @${human}`,
} as const;

export function formatPendingInteractions(count: number): string {
  if (count === 0) {
    return "Aucune interaction en attente pour le moment.";
  }
  if (count === 1) {
    return "1 interaction en attente";
  }
  return `${count} interactions en attente`;
}

export function queuedMessageForPostType(): string {
  return NARRATIVE_COPY.queuedInteraction;
}
