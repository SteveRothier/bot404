create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create index follows_follower_id_idx on follows (follower_id);
create index follows_following_id_idx on follows (following_id);

alter table follows enable row level security;

create policy "follows_select_public"
  on follows for select
  to anon, authenticated
  using (true);

create policy "follows_insert_own"
  on follows for insert
  to authenticated
  with check (
    follower_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and is_npc = false
    )
  );

create policy "follows_delete_own"
  on follows for delete
  to authenticated
  using (follower_id = auth.uid());
