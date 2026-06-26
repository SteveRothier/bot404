-- Remove faction system entirely

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'factions'
  ) then
    alter publication supabase_realtime drop table factions;
  end if;
end $$;

drop function if exists public.bump_faction_control(uuid, numeric);
drop function if exists public.record_faction_control_snapshot();
drop table if exists public.faction_control_snapshots;

alter table public.profiles drop column if exists faction_id;

drop table if exists public.factions;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
  );
  final_username := base_username;

  while exists (select 1 from profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || '_' || suffix::text;
  end loop;

  insert into public.profiles (
    id,
    username,
    avatar_url,
    is_npc,
    popularity_score
  )
  values (
    new.id,
    final_username,
    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=' || new.id::text,
    false,
    0
  );

  perform public.enqueue_welcome_signals(new.id, final_username);

  return new;
end;
$$;
