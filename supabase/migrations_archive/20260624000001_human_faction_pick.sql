-- Faction joueur à l'inscription (metadata faction_slug)

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
  faction_slug text;
  resolved_faction_id uuid;
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

  faction_slug := nullif(trim(new.raw_user_meta_data->>'faction_slug'), '');
  if faction_slug is not null then
    select id into resolved_faction_id
    from factions
    where slug = faction_slug;
  end if;

  insert into public.profiles (
    id,
    username,
    avatar_url,
    is_npc,
    popularity_score,
    faction_id
  )
  values (
    new.id,
    final_username,
    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=' || new.id::text,
    false,
    0,
    resolved_faction_id
  );

  perform public.enqueue_welcome_signals(new.id, final_username);

  return new;
end;
$$;
