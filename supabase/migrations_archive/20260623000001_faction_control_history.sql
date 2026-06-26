-- Historique du contrôle des factions (graphique / timeline)

create table faction_control_snapshots (
  id bigserial primary key,
  recorded_at timestamptz not null default now(),
  values jsonb not null
);

create index faction_control_snapshots_recorded_at_idx
  on faction_control_snapshots (recorded_at desc);

alter table faction_control_snapshots enable row level security;

create policy "faction_control_snapshots_select_public"
  on faction_control_snapshots for select
  using (true);

-- Snapshot initial depuis l'état courant
insert into faction_control_snapshots (values)
select jsonb_agg(
  jsonb_build_object('slug', slug, 'percent', control_percent)
  order by slug
)
from factions;

create or replace function public.record_faction_control_snapshot()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_values jsonb;
  last_values jsonb;
  last_at timestamptz;
  max_delta numeric := 0;
  slug_key text;
  new_pct numeric;
  old_pct numeric;
begin
  select jsonb_agg(
    jsonb_build_object('slug', slug, 'percent', control_percent)
    order by slug
  )
  into new_values
  from factions;

  if new_values is null then
    return;
  end if;

  select values, recorded_at
  into last_values, last_at
  from faction_control_snapshots
  order by recorded_at desc
  limit 1;

  if last_values is null then
    insert into faction_control_snapshots (values) values (new_values);
    return;
  end if;

  if last_at > now() - interval '2 minutes' then
    for slug_key, new_pct in
      select e->>'slug', (e->>'percent')::numeric
      from jsonb_array_elements(new_values) e
    loop
      select (e->>'percent')::numeric into old_pct
      from jsonb_array_elements(last_values) e
      where e->>'slug' = slug_key;

      if old_pct is not null then
        max_delta := greatest(max_delta, abs(new_pct - old_pct));
      end if;
    end loop;

    if max_delta < 0.1 then
      return;
    end if;
  end if;

  insert into faction_control_snapshots (values) values (new_values);
end;
$$;

create or replace function public.bump_faction_control(
  p_faction_id uuid,
  p_delta numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  total numeric;
  target numeric;
begin
  if p_faction_id is null or p_delta = 0 then
    return;
  end if;

  update factions
  set control_percent = greatest(5, control_percent + p_delta)
  where id = p_faction_id;

  select coalesce(sum(control_percent), 0) into total from factions;
  if total <= 0 then
    return;
  end if;

  for r in select id, control_percent from factions loop
    target := round((r.control_percent / total) * 1000) / 10;
    update factions set control_percent = target where id = r.id;
  end loop;

  perform public.record_faction_control_snapshot();
end;
$$;

grant execute on function public.record_faction_control_snapshot() to service_role;
grant execute on function public.bump_faction_control(uuid, numeric) to service_role;
