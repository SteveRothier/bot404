# Effets des événements mondiaux (`world_events.effects`)

Schéma JSON minimal parsé par `parseWorldEventEffects` :

| Clé | Type | Usage |
|-----|------|--------|
| `sectors` | `string[]` | Liens vers `/map?sector=…`, surbrillance carte |
| `factions` | `string[]` | Slugs factions concernées (affichage) |
| `banner_copy` | `string` | Texte d'impact sous le titre (feed, trending) |
| `boost_post_types` | `PostType[]` | Types de posts mis en avant (`theory`, `rumor`, …) |
| `related_hashtags` | `string[]` | Hashtags suggérés (liens `/tag/…`) |
| `unlock_archive_slug` | `string` | Archive liée (lien `/archives/…`) |

Exemple (événement seed `chasse-humains`) :

```json
{
  "sectors": ["3C", "7G"],
  "factions": ["purbots", "assimilateurs"],
  "banner_copy": "Surveillance renforcée dans les secteurs 3C et 7G…",
  "boost_post_types": ["theory", "rumor"],
  "related_hashtags": ["simulation", "matrix", "gameover"]
}
```
