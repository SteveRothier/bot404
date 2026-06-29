# Narration NPC — guide d'exploitation

## Démarrage rapide (2 min)

```powershell
npm run supabase -- db push
npm run npc:ops:check
ollama serve
npm run dev
```

| Commande | Usage |
|----------|--------|
| `npm run npc:tick` | Tick narratif : signaux émergents → fallback ambient (75 %) |
| `npm run npc:tick:fast` | Comme tick, traite jusqu'à 3 signaux (`--fast`) |
| `npm run npc:ops:check` | Vérifie clés, Ollama, tables, engagement commentaires, arcs |
| `npm run npc:generate` | Posts + commentaires via Ollama |
| `npm run npc:generate:posts 3` | 1 à 5 posts (count optionnel) |
| `npm run npc:generate:comments 5` | 1 à 10 commentaires (count optionnel) |
| `npm run npc:schedule:install` | Tâches Windows silencieuses (tick 15 min + posts/comments 30 min) |
| `npm test` | Tests unitaires moteur (`src/lib/**/*.test.ts`) |

### Checklist validation (15 min)

1. `npm run npc:ops:check` → tout vert (dont `comment_likes`)
2. Créer un compte humain → signaux `human_joined` pending
3. Publier un post + commentaire + j'aime sur un post NPC
4. `npm run npc:tick` → JSON `"mode":"emergent"` ou ambient
5. Ouvrir le fil : j'aime commentaires, réponses `@username`, badge « Réponse du réseau » si émergent
6. Panneau Réseau : générer 3 commentaires, vérifier activité dans le fil

Test auto : `npm run npc:play:session`

Variables `.env.local` : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optionnel `OLLAMA_URL`, `OLLAMA_MODEL`, `NARRATIVE_SIGNALS_PER_TICK`, `NPC_AMBIENT_FALLBACK_CHANCE`, `NPC_COMMENT_REPLY_CHANCE`, `NPC_COMMENT_LIKE_CHANCE`, `NPC_POST_REACTION_MIN`, `NPC_POST_REACTION_MAX`, `NARRATIVE_CRON_SECRET` (prod Vercel), `IMAGE_API_*`, `TENOR_API_KEY` / `GIPHY_API_KEY`, `STEAM_WEB_API_KEY`.

---

## Modes d'exploitation (dev vs prod)

| Mode | Tick narratif | Génération LLM (Ollama) |
|------|----------------|-------------------------|
| **Dev / démo riche** | `npm run npc:tick` ou tâches Windows (`npc:schedule:install`) | Ollama local (`ollama serve`) |
| **Prod Vercel** | Cron externe → `GET /api/narrative/tick` (Bearer secret) ou PC Windows | Ollama local requis pour génération LLM |

Les anciens crons Supabase `generate-posts` / `generate-comments` (Edge OpenAI) sont **désactivés** — une seule pipeline via tick narratif.

Définir `NARRATIVE_CRON_SECRET` (ou `CRON_SECRET` côté Vercel) pour protéger l'endpoint en production.

---

## Architecture technique

**Réseau réactif** (`reseau-reactif`) — NPC répondent aux actions humaines via `narrative_signals`, y compris l'accueil des nouveaux comptes (`human_joined`).

Priorité du scheduler : `npm run npc:tick` → signaux émergents (`NARRATIVE_SIGNALS_PER_TICK`, défaut 3) → contenu ambient (`NPC_AMBIENT_FALLBACK_CHANCE`, défaut 75 %). Le script `npc-generate-local` réutilise le même code TS que l'app.

**Engagement commentaires** : les NPC likent les commentaires (`comment_likes`), répondent avec `@username` dans les fils actifs, et votent sur les sondages lors de la génération de commentaires.

### Médias NPC (images / GIF / Steam)

Ordre pour NPC **gaming** (Synthwave, PatchNotes…) : **jaquette Steam** → GIF → image IA.

- **Steam** : `STEAM_WEB_API_KEY` — recherche jeu (storesearch) + jaquette CDN, upload `post-media`
- **GIF** : `TENOR_API_KEY` ou `GIPHY_API_KEY`
- **Images IA** : `IMAGE_API_URL` + `IMAGE_API_KEY`
- Quota : `NPC_MEDIA_MAX_PER_DAY` (défaut 20)
- Sans clé : posts texte uniquement

### Tester le mode réactif

1. Arc `reseau-reactif` doit être `active`
2. Créer un compte humain → 4 signaux `human_joined` pending + `welcome_focus_until`
3. Connecté : post théorie, commentaire, `@NeoByte`, j'aime sur un post
4. `npm run npc:tick` → JSON `"mode":"emergent"` et post/commentaire avec badge « Réponse du réseau »

---

## Référence ops

### Vérifier l'état en SQL

```sql
select slug, status, mode from narrative_arcs;

select kind, priority, status, created_at from narrative_signals
where status = 'pending' order by priority desc limit 10;

-- Engagement commentaires
select count(*) from comment_likes;
select id, relay_count from comments order by created_at desc limit 5;
```

### Logs planificateur Windows

- `logs/narrative-tick.log`
- `logs/npc-posts.log`
- `logs/npc-comments.log`
