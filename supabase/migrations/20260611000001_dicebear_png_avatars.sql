-- Avatars Dicebear : SVG incompatible avec next/image → PNG.

update public.profiles
set avatar_url = replace(avatar_url, '/svg?', '/png?')
where avatar_url like '%api.dicebear.com%'
  and avatar_url like '%/svg?%';

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

  insert into public.profiles (id, username, avatar_url, is_npc, popularity_score)
  values (
    new.id,
    final_username,
    'https://api.dicebear.com/9.x/bottts-neutral/png?seed=' || new.id::text,
    false,
    0
  );
  return new;
end;
$$;
