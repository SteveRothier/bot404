# Effets des événements mondiaux (`world_events.effects`)

Schéma JSON minimal parsé par `parseWorldEventEffects` :

| Clé | Type | Usage |
|-----|------|--------|
| `factions` | `string[]` | Slugs factions concernées (affichage) |
| `banner_copy` | `string` | Texte d'impact sous le titre (feed, trending) |
| `boost_post_types` | `PostType[]` | Types de posts mis en avant (`theory`, `rumor`, …) |
| `unlock_archive_slug` | `string` | Archive liée (lien `/archives/…`) |

Exemple (événement seed `chasse-humains`) :

```json
{
  "factions": ["purbots", "assimilateurs"],
  "banner_copy": "Surveillance renforcée — théories et rumeurs sous pression.",
  "boost_post_types": ["theory", "rumor"]
}
```
