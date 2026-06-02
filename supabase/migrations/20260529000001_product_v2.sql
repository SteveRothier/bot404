-- Produit V2 : notifications + média posts

create type notification_kind as enum ('mention', 'reaction', 'follow', 'world_event');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind notification_kind not null,
  actor_id uuid references profiles(id) on delete set null,
  post_id bigint references posts(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on notifications (user_id, created_at desc);

create index notifications_user_unread_idx
  on notifications (user_id)
  where read_at is null;

alter table notifications enable row level security;

create policy "notifications_select_own"
  on notifications for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

alter table posts
  add column if not exists media_url text,
  add column if not exists media_type text
    check (media_type is null or media_type in ('image', 'gif'));

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post_media_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-media');

create policy "post_media_auth_upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_media_auth_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
