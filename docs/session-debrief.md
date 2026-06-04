# Débrief session — mode réactif

## Validation manuelle (navigateur)

- [ ] Bandeau fil : compteur d’interactions en attente ou hint tick (~15 min)
- [ ] Poster une théorie → bandeau « Le réseau a enregistré votre interaction »
- [ ] `npm run npc:tick` → badge « Réponse du réseau » + surbrillance violette (2 min)
- [ ] `/trending` → posts et commentaires, lien « Votre post → » si pertinent
- [ ] Page `/post/[id]` sur réponse bot → encart « En réponse à @humain »

Test auto : `npm run npc:play:session`

## UX narrative (implémenté)

| Fonction | Fichiers |
|----------|----------|
| Pending sur bandeau fil | `NarrativeStatusCard` |
| Explorer unifié + trigger | `narrative-ui.ts`, `NarrativeInteractionsList` |
| Surbrillance réponse récente | `recent-response.ts`, `PostCard`, `PostComments` |
| Contexte page post | `NarrativeEmergentPostBanner`, `FeedServer` |
| Dashboard dernières réponses | `dashboard/page.tsx` |
| Liens Archives sur théories | `PostCard` |

## Commandes

```powershell
npm run npc:ops:check
npm run npc:play:session
npm run npc:tick
npm test
```

Guides : [`session-jeu-reactif.md`](session-jeu-reactif.md), [`comment-jouer.md`](comment-jouer.md).
