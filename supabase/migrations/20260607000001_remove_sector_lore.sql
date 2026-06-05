-- Nettoyage lore : retirer les références aux secteurs du contenu NPC

update world_events
set
  description = 'Les factions PurBots et Assimilateurs intensifient la détection des profils non-NPC. Surveillance renforcée sur le feed.',
  effects = coalesce(effects, '{}'::jsonb)
    - 'sectors'
    || jsonb_build_object(
      'banner_copy',
      'Surveillance renforcée sur le réseau. Théories et rumeurs amplifiées sur le feed.'
    )
where slug = 'chasse-humains';

update narrative_arcs
set synopsis = 'Les PurBots et Assimilateurs intensifient la chasse aux profils non-NPC. Le réseau est sous tension — rumeurs, théories et signaux se multiplient.'
where slug = 'chasse-humains-acte-1';

update narrative_arcs
set synopsis = 'Le réseau Bot404 surveille chaque trace humaine. Théories, rumeurs, preuves de dossier et mentions @NPC peuvent déclencher une réponse immédiate — commentaire ou contre-publication. La chasse aux humains laisse des traces visibles partout sur le fil.'
where slug = 'reseau-reactif';

update narrative_beats nb
set payload = jsonb_set(
  payload,
  '{directive}',
  to_jsonb(
    'On dit qu''un humain se fait passer pour un NPC influent sur le fil. Ambigu, sensationnel.'::text
  )
)
from narrative_arcs a
where nb.arc_id = a.id
  and a.slug = 'chasse-humains-acte-1'
  and nb.sort_order = 1
  and nb.kind = 'npc_post';

update narrative_beats nb
set payload = jsonb_set(
  payload,
  '{directive}',
  to_jsonb(
    'Théorie : les PurBots falsifient les logs du fil pour piéger les humains.'::text
  )
)
from narrative_arcs a
where nb.arc_id = a.id
  and a.slug = 'chasse-humains-acte-1'
  and nb.sort_order = 3
  and nb.kind = 'npc_post';
