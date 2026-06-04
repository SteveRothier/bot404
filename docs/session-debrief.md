# Débrief session — mode réactif

Dernière validation automatique : `npm run npc:play:session`.

## Résultat technique (automatisé)

| Étape | Statut | Détail |
|-------|--------|--------|
| Ollama | OK | en ligne |
| Arc émergent | OK | `reseau-reactif` active |
| Post théorie + tick | OK | réponse bot (post ou commentaire) |

## Lacunes UX — résolues

| Sujet | Statut |
|-------|--------|
| Posts émergents dans Explorer | OK — `getRecentNarrativeInteractions` fusionne posts + commentaires |
| Badge sur posts NPC émergents | OK — `PostCard` + `narrative_signal_id` |
| Feedback après action humaine | OK — bandeau `NarrativeQueuedBanner` (composer + commentaires) |

## À valider manuellement dans le navigateur

- [ ] Poster une théorie → bandeau violet « enregistré votre interaction »
- [ ] `npm run npc:tick` → badge « Réponse du réseau » sur post ou commentaire bot
- [ ] `/trending` → entrées `post` et `commentaire` dans « Réponses des bots aux joueurs »

## Planificateur Windows

- Tâche `bot404-narrative-tick` (15 min) — logs : `logs/narrative-tick.log`
- « Aucun signal en attente » sans post humain récent : **normal**

## Suite possible (contenu)

- Acte 2 scripté ou événements lore déclenchés par le joueur

## Commandes

```powershell
npm run npc:ops:check
npm run npc:play:session
npm run npc:tick
npm test
```

Guides : [`session-jeu-reactif.md`](session-jeu-reactif.md), [`comment-jouer.md`](comment-jouer.md).
