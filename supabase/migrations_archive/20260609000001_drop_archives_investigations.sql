-- Archives et dossiers retirés du produit.

update narrative_beats
set
  kind = 'pause',
  payload = '{"message":"Fragment de lore retiré — le réseau poursuit l''observation."}'::jsonb
where kind = 'archive_unlock';

alter table narrative_signals
  drop column if exists investigation_entry_id;

drop table if exists investigation_votes cascade;
drop table if exists investigation_entries cascade;
drop table if exists investigations cascade;
drop table if exists archives cascade;

drop type if exists investigation_vote_kind;
drop type if exists investigation_status;

drop table if exists network_activity cascade;
