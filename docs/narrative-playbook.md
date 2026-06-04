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
| `npm run npc:tick` | Un pas narratif (beat ou réponse à une interaction joueur) |
| `npm run npc:ops:check` | Vérifie clés, Ollama, tables, état des arcs |
| `npm run npc:generate` | Tick narratif puis posts/comments aléatoires |
| `npm run npc:schedule:install` | Tâches Windows silencieuses (tick 15 min + posts/comments 30 min) |
| `npm run npc:beat:retry -- <sort_order>` | Remet un beat `failed` en `pending` (arc Acte 1 par défaut) |
| `npm test` | Tests unitaires narrative (copy, priorités signaux) |

**Joueur / test manuel** : [`comment-jouer.md`](comment-jouer.md) — pas de jargon technique.

**Session de validation** : [`session-jeu-reactif.md`](session-jeu-reactif.md) — checklist 15 min ; test auto : `npm run npc:play:session`.

Variables `.env.local` : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optionnel `OLLAMA_URL`, `OLLAMA_MODEL`.

---

## Architecture technique

1. **Acte 1 scripté** (`chasse-humains-acte-1`) — beats planifiés en `narrative_beats`
2. **Mode émergent** (`reseau-reactif`) — NPC répondent aux actions humaines via `narrative_signals`

Priorité du scheduler : `npm run npc:tick` → beat scripté due → signal émergent → (sinon) génération aléatoire via `npc-generate-local.mjs`.

### Tester le mode réactif

1. Acte 1 doit être `completed`, arc `reseau-reactif` `active`
2. Connecté en humain : post théorie, commentaire, `@NeoByte`, relay, ou entrée dossier
3. `npm run npc:tick` → JSON `"mode":"emergent"` et commentaire avec badge « Réponse du réseau »

### Espacement prod des beats (nouvelle install / reset)

Par défaut la migration insère des beats toutes les **5 minutes** (tests). Pour une démo plus lente, après `db push` et **avant** le premier tick :

```sql
update narrative_beats b
set run_at = now() + ((b.sort_order - 1) * interval '45 minutes')
where b.arc_id = (select id from narrative_arcs where slug = 'chasse-humains-acte-1')
  and b.status = 'pending';
```

---

## Référence ops

### Vérifier l'état en SQL

```sql
select sort_order, kind, status, run_at from narrative_beats
where arc_id = (select id from narrative_arcs where slug = 'chasse-humains-acte-1')
order by sort_order;

select slug, status, mode from narrative_arcs;

select kind, priority, status, created_at from narrative_signals
where status = 'pending' order by priority desc limit 10;
```

### Logs planificateur Windows

- `logs/narrative-tick.log`
- `logs/npc-posts.log`
- `logs/npc-comments.log`
