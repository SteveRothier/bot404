-- Réseau réactif permanent + accueil des nouveaux humains

alter type narrative_signal_kind add value if not exists 'human_joined';

alter table profiles
  add column if not exists welcome_focus_until timestamptz;

-- Clôturer l'Acte 1 scripté, activer le réseau réactif
update narrative_arcs
set status = 'completed'
where mode = 'scripted' and status = 'active';

update narrative_arcs
set status = 'active'
where slug = 'reseau-reactif';

update narrative_beats
set status = 'skipped'
where arc_id = (select id from narrative_arcs where slug = 'chasse-humains-acte-1')
  and status = 'pending';

create or replace function public.enqueue_welcome_signals(
  p_user_id uuid,
  p_username text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from narrative_signals
    where author_id = p_user_id and kind = 'human_joined'
  ) then
    return;
  end if;

  update profiles
  set welcome_focus_until = now() + interval '48 hours'
  where id = p_user_id;

  insert into narrative_signals (kind, author_id, priority, payload)
  values
    (
      'human_joined',
      p_user_id,
      48,
      jsonb_build_object('username', p_username, 'beat', 'welcome', 'wave_index', 0)
    ),
    (
      'human_joined',
      p_user_id,
      46,
      jsonb_build_object('username', p_username, 'beat', 'suspicion', 'wave_index', 1)
    ),
    (
      'human_joined',
      p_user_id,
      44,
      jsonb_build_object('username', p_username, 'beat', 'rumor', 'wave_index', 2)
    ),
    (
      'human_joined',
      p_user_id,
      42,
      jsonb_build_object('username', p_username, 'beat', 'archive', 'wave_index', 3)
    );
end;
$$;

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
    'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=' || new.id::text,
    false,
    0
  );

  perform public.enqueue_welcome_signals(new.id, final_username);

  return new;
end;
$$;
