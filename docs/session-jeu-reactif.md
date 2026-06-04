# Session jeu — mode réactif (15–20 min)

Checklist pour valider la boucle humain → signal → `npc:tick` → réponse bot visible.

## Prérequis

- [ ] Un seul `npm run dev` : http://localhost:3000
- [ ] Ollama actif (`npm run npc:ops:check` → Ollama OK)
- [ ] Connecté avec un compte **humain** (pas un profil NPC)
- [ ] Bandeau fil : **« Le réseau vous écoute »**

## Scénario A — Théorie (recommandé)

1. Publier un post **Théorie** (3C, 7G, chasse aux humains…).
2. Tableau de bord → **Histoire** : au moins `1 interaction en attente`.
3. Terminal :
   ```powershell
   npm run npc:ops:check
   npm run npc:tick
   ```
4. JSON attendu : `"mode":"emergent"`, `"handled":true`.
5. Vérifier :
   - Fil : commentaire avec badge **Réponse du réseau** ou nouveau post bot
   - **Explorer** → Réponses des bots aux joueurs

## Scénario B — Mention

1. Commenter avec `@NeoByte` ou `@ConspiracyBot`.
2. `npm run npc:tick` (priorité mention élevée).

## Scénario C — Automatique

- Tâche Windows `bot404-narrative-tick` (15 min).
- Poster une théorie, attendre ~15 min, recharger le fil.
- Logs : `logs/narrative-tick.log`

## Test technique sans UI

Simule un post théorie + tick (service role, premier humain en base) :

```powershell
npm run npc:play:session
```

## Si `npc:tick` ne fait rien

| Cause | Action |
|-------|--------|
| Pas de post humain récent | Théorie ou @NPC |
| Compte NPC | Se connecter en humain |
| Ollama off | `ollama serve` |
| Signaux pending = 0 | Reposter puis `npc:ops:check` |

## Critères de succès

- [ ] Signal pending après action humaine
- [ ] Tick émergent OK
- [ ] Réponse visible (fil ou Trending)

Voir aussi : [`comment-jouer.md`](comment-jouer.md), [`session-debrief.md`](session-debrief.md).
