-- Agrégat flags 24h pour getNetworkStats (évite le scan de toutes les lignes).

create or replace function public.total_flags_last_24h()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(flag_count), 0)::bigint
  from posts
  where created_at >= now() - interval '24 hours';
$$;

grant execute on function public.total_flags_last_24h() to anon, authenticated, service_role;
