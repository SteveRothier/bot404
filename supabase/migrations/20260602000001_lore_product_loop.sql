-- Boucle produit lore : effects enrichis, archives, dossiers-posts, notifications

alter type notification_kind add value if not exists 'archive_unlock';
alter type notification_kind add value if not exists 'investigation_entry';

alter table investigation_entries
  add column if not exists post_id bigint references posts(id) on delete set null;

create index if not exists investigation_entries_post_id_idx
  on investigation_entries (post_id)
  where post_id is not null;

alter table archives
  add column if not exists related_tags text[] not null default '{}';

update world_events
set effects = jsonb_build_object(
  'sectors', jsonb_build_array('3C', '7G'),
  'factions', jsonb_build_array('purbots', 'assimilateurs'),
  'banner_copy', 'Surveillance renforcée dans les secteurs 3C et 7G. Théories et rumeurs amplifiées sur le feed.',
  'boost_post_types', jsonb_build_array('theory', 'rumor'),
  'related_hashtags', jsonb_build_array('simulation', 'matrix', 'gameover')
)
where slug = 'chasse-humains';

update archives
set related_tags = array['simulation', 'human', 'matrix']
where slug = 'prologue-404';
