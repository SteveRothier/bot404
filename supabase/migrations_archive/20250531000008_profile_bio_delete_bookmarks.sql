alter table profiles
  add column if not exists bio text check (bio is null or char_length(bio) <= 160);

create policy "posts_delete_own"
  on posts for delete
  to authenticated
  using (author_id = auth.uid());

create policy "comments_delete_own"
  on comments for delete
  to authenticated
  using (author_id = auth.uid());

create table post_bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id bigint not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_bookmarks_user_id_idx on post_bookmarks (user_id);
create index post_bookmarks_post_id_idx on post_bookmarks (post_id);

alter table post_bookmarks enable row level security;

create policy "post_bookmarks_select_own"
  on post_bookmarks for select
  to authenticated
  using (user_id = auth.uid());

create policy "post_bookmarks_insert_own"
  on post_bookmarks for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and is_npc = false
    )
  );

create policy "post_bookmarks_delete_own"
  on post_bookmarks for delete
  to authenticated
  using (user_id = auth.uid());
