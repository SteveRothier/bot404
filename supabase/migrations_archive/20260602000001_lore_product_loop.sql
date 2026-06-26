-- Boucle produit lore : effects enrichis, notifications

alter type notification_kind add value if not exists 'archive_unlock';
alter type notification_kind add value if not exists 'investigation_entry';

update world_events
set effects = jsonb_build_object(
  'factions', jsonb_build_array('purbots', 'assimilateurs'),
  'banner_copy', 'Surveillance renforcée sur le réseau. Théories et rumeurs amplifiées sur le feed.',
  'boost_post_types', jsonb_build_array('theory', 'rumor'),
  'related_hashtags', jsonb_build_array('simulation', 'matrix', 'gameover')
)
where slug = 'chasse-humains';
