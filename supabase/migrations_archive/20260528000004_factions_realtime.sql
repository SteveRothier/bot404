-- Realtime pour le widget Contrôle
alter table factions replica identity full;
alter table profiles replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'factions'
  ) then
    alter publication supabase_realtime add table factions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table profiles;
  end if;
end $$;

-- Ajuste une faction puis normalise les 4 à 100 %
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
end;
$$;

grant execute on function public.bump_faction_control(uuid, numeric) to service_role;
