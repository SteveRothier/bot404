-- Retrait messagerie privée

drop function if exists public.create_direct_conversation(uuid);

alter table if exists notifications
  drop column if exists conversation_id;

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime drop table messages;
  end if;
end $$;

drop table if exists message_signals cascade;
drop table if exists messages cascade;
drop table if exists conversation_participants cascade;
drop table if exists conversations cascade;

drop type if exists message_signal_status;
drop type if exists conversation_kind;
