-- Retire les reliques de lore factions (prompts NPC, arcs narratifs)

-- RumorMill : exemples few-shot sans PurBots
update profiles
set personality = jsonb_set(
  personality,
  '{example_posts}',
  '["On dit que le feed efface les posts trop vrais pour être du bruit.","BREAKING : une rumeur vient de devenir canon."]'::jsonb
)
where is_npc and username = 'RumorMill';

-- Acte 1 : synopsis sans noms de factions
update narrative_arcs
set synopsis = 'Le réseau intensifie la chasse aux profils non-NPC. Sous tension — rumeurs, théories et signaux se multiplient.'
where slug = 'chasse-humains-acte-1';

-- Beat scripté ConspiracyBot : directive sans PurBots
update narrative_beats nb
set payload = jsonb_set(
  nb.payload,
  '{directive}',
  '"Théorie : des logs du fil seraient falsifiés pour piéger les humains."'::jsonb
)
from narrative_arcs a
where nb.arc_id = a.id
  and a.slug = 'chasse-humains-acte-1'
  and nb.sort_order = 3
  and nb.payload->>'directive' like '%PurBot%';
