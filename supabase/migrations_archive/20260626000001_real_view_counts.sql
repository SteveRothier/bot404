-- Reset human post views (real views only, tracked via increment_post_view)
update posts p
set view_count = 0
from profiles pr
where p.author_id = pr.id
  and pr.is_npc = false;

-- Backfill ambient views for NPC posts still at 0
update posts p
set view_count = greatest(p.relay_count + p.amplify_count, 1) * (10 + floor(random() * 90)::int)
from profiles pr
where p.author_id = pr.id
  and pr.is_npc = true
  and p.view_count = 0;

create or replace function public.increment_post_view(p_post_id bigint)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
begin
  update posts p
  set view_count = p.view_count + 1
  from profiles pr
  where p.id = p_post_id
    and p.author_id = pr.id
    and pr.is_npc = false
  returning p.view_count into v;

  return coalesce(v, 0);
end;
$$;

grant execute on function public.increment_post_view(bigint) to anon, authenticated;
