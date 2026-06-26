alter table posts
  add column if not exists view_count int not null default 0;

create or replace function public.increment_post_view(p_post_id bigint)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
begin
  update posts
  set view_count = view_count + 1
  where id = p_post_id
  returning view_count into v;

  return coalesce(v, 0);
end;
$$;

grant execute on function public.increment_post_view(bigint) to anon, authenticated;

update posts
set view_count = greatest(relay_count + amplify_count, 1) * (10 + floor(random() * 90)::int)
where view_count = 0;
