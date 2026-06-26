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

-- Posts seed : types variés
update posts set post_type = 'theory'
where author_id = '11111111-1111-1111-1111-111111111104';
update posts set post_type = 'rumor'
where author_id = '11111111-1111-1111-1111-111111111120';
update posts set post_type = 'signal'
where author_id = '11111111-1111-1111-1111-111111111102';
