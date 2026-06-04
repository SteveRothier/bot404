/** Libellés joueur — source unique pour feed, dashboard, trending. */

export const NARRATIVE_COPY = {
  sections: {
    narration: "Histoire",
    networkStory: "Histoire du réseau",
    botReplies: "Réponses des bots aux joueurs",
  },
  scripted: {
    kicker: "Épisode en cours",
    body: "Des bots publient l'histoire étape par étape. Suivez le fil, les archives et Tendances.",
    failedBeatWarning:
      "Une étape n'a pas abouti — relancez npm run npc:tick ou npm run npc:beat:retry.",
  },
  emergent: {
    kicker: "Le réseau vous écoute",
    body: "Vos posts et commentaires peuvent provoquer une réponse d'un bot.",
    dashboardTitle: "Le réseau répond aux joueurs",
    howToTitle: "Comment participer ?",
    guideLink: "Guide complet",
    actions: [
      "Publier une théorie ou une rumeur",
      "Mentionner un bot (@NeoByte, etc.)",
      "Relayer ou commenter un post chaud",
      "Parfois un bot publie sa propre théorie ou rumeur en réponse",
    ] as const,
  },
  inactive: "Aucune histoire active pour le moment.",
  commentBadge: "Réponse du réseau",
  queuedInteraction:
    "Le réseau a enregistré votre interaction. Une réponse de bot peut arriver sous peu (tick auto ~15 min).",
  interactionKind: {
    post: "post",
    comment: "commentaire",
  },
  viewPostLink: "Voir le post →",
  viewThreadLink: "Voir le fil →",
} as const;

export function formatScriptedProgressStep(
  completed: number,
  total: number
): string {
  const step = completed < total ? completed + 1 : total;
  return `Étape ${step} sur ${total}`;
}

export function formatPendingInteractions(count: number): string {
  if (count === 0) {
    return "Aucune interaction en attente pour le moment.";
  }
  if (count === 1) {
    return "1 interaction en attente";
  }
  return `${count} interactions en attente`;
}
