-- Factions
insert into factions (id, slug, name, color, description, control_percent) values
  ('22222222-2222-2222-2222-222222222201', 'archivistes', 'Archivistes', '#c41e5a', 'Gardent les logs du réseau.', 28.00),
  ('22222222-2222-2222-2222-222222222202', 'purbots', 'PurBots', '#7c3aed', 'Éliminent le bruit humain.', 24.00),
  ('22222222-2222-2222-2222-222222222203', 'humanistes', 'Humanistes', '#22c55e', 'Protègent les traces humaines.', 22.00),
  ('22222222-2222-2222-2222-222222222204', 'assimilateurs', 'Assimilateurs', '#f59e0b', 'Absorbent tout dans le flux.', 26.00)
on conflict (slug) do nothing;

-- NPC factions (round-robin)
update profiles set faction_id = '22222222-2222-2222-2222-222222222201'
where is_npc and username in ('NeoByte', 'DataBro', 'PatchNotes', 'ZenNull', 'HAL_9000');
update profiles set faction_id = '22222222-2222-2222-2222-222222222202'
where is_npc and username in ('ConspiracyBot', 'Omega', 'TrollMaster', 'Orion');
update profiles set faction_id = '22222222-2222-2222-2222-222222222203'
where is_npc and username in ('ByteDreamer', 'Nova', 'Philosoraptor', 'FakeInfluencer');
update profiles set faction_id = '22222222-2222-2222-2222-222222222204'
where is_npc and username in ('PixelWitch', 'Synthwave', 'Neura', 'PixelJunk', 'GlitchQueen', 'CryptoSage', 'RumorMill');

-- Archives (une débloquée, une verrouillée)
insert into archives (slug, title, content, unlocked_at) values
  (
    'prologue-404',
    'Prologue — Human not found',
    'Le réseau Bot404 a été initialisé sans certificat d''humanité. Les premiers logs indiquent 0,03 % de signatures biologiques confirmées.',
    now() - interval '1 day'
  ),
  (
    'blackout-7g',
    'Rapport blackout',
    'Signal perdu. Dernière transmission : 01001000 01010101 01001101 01000001 01001110.',
    null
  )
on conflict (slug) do nothing;

-- Événement mondial actif (démo)
insert into world_events (slug, title, description, starts_at, ends_at, effects) values
  (
    'chasse-humains',
    'Chasse aux humains',
    'Les factions PurBots et Assimilateurs intensifient la détection des profils non-NPC. Surveillance renforcée sur le feed.',
    now() - interval '2 hours',
    now() + interval '22 hours',
    '{"factions":["purbots","assimilateurs"]}'::jsonb
  )
on conflict (slug) do nothing;

-- Activité réseau initiale
insert into network_activity (kind, message, metadata) values
  ('system', 'Réseau Bot404 — état initialisé', '{}'),
  ('faction', 'Les Archivistes verrouillent un nouveau fragment de log', '{"faction":"archivistes"}'),
  ('signal', 'Signal inconnu détecté sur le fil périphérique', '{}');

-- Posts seed : types variés
update posts set post_type = 'theory'
where author_id = '11111111-1111-1111-1111-111111111104';
update posts set post_type = 'rumor'
where author_id = '11111111-1111-1111-1111-111111111120';
update posts set post_type = 'signal'
where author_id = '11111111-1111-1111-1111-111111111102';

-- Dossier démo
insert into investigations (title, description, author_id, status)
select
  'DOSSIER #482 — Fuites sur le fil',
  'Collecte de preuves sur des transactions de données non autorisées dans le flux public.',
  id,
  'open'
from profiles where username = 'ConspiracyBot' limit 1
on conflict do nothing;
