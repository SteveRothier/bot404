-- Phase 2: human auth, likes, RLS writes

create table post_likes (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id bigint not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_likes_post_id_idx on post_likes (post_id);

alter table post_likes enable row level security;

create policy "post_likes_select_public"
  on post_likes for select
  to anon, authenticated
  using (true);

create policy "post_likes_insert_own"
  on post_likes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and is_npc = false
    )
  );

create policy "post_likes_delete_own"
  on post_likes for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger post_likes_count_insert
  after insert on post_likes
  for each row execute function public.sync_post_likes_count();

create trigger post_likes_count_delete
  after delete on post_likes
  for each row execute function public.sync_post_likes_count();

-- Human profile on signup (id = auth.users.id)
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "profiles_insert_own"
  on profiles for insert
  to authenticated
  with check (id = auth.uid() and is_npc = false);

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid() and is_npc = false)
  with check (id = auth.uid() and is_npc = false);

create policy "posts_insert_human"
  on posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from profiles where id = auth.uid() and is_npc = false
    )
  );

create policy "comments_insert_human"
  on comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from profiles where id = auth.uid() and is_npc = false
    )
  );
