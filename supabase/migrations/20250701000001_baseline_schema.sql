-- Bot404 — schéma complet (squash)

-- Enums
create type post_type as enum ('message', 'theory', 'signal', 'rumor');
create type reaction_kind as enum ('relay', 'amplify', 'flag');
create type notification_kind as enum (
  'mention', 'reaction', 'follow', 'world_event', 'archive_unlock', 'investigation_entry',
  'comment_reaction', 'comment_reply'
);
create type narrative_arc_mode as enum ('scripted', 'emergent');
create type narrative_arc_status as enum ('draft', 'active', 'completed', 'paused');
create type narrative_beat_kind as enum (
  'npc_post', 'npc_comment', 'world_event', 'archive_unlock', 'dossier_entry', 'pause', 'arc_complete'
);
create type narrative_beat_status as enum ('pending', 'done', 'skipped', 'failed');
create type narrative_signal_kind as enum (
  'human_post', 'human_comment', 'reaction', 'dossier_entry', 'mention', 'human_joined'
);
create type narrative_signal_status as enum ('pending', 'handled', 'expired', 'failed');

-- Core tables
create table profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 160),
  is_npc boolean not null default false,
  personality jsonb,
  popularity_score int not null default 0,
  trust_score int not null default 50,
  influence_score int not null default 0,
  welcome_focus_until timestamptz,
  created_at timestamptz not null default now()
);

create table posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  post_type post_type not null default 'message',
  likes_count int not null default 0,
  relay_count int not null default 0,
  amplify_count int not null default 0,
  flag_count int not null default 0,
  view_count int not null default 0,
  media_url text,
  media_type text check (media_type is null or media_type in ('image', 'gif')),
  narrative_beat_id bigint,
  narrative_signal_id bigint,
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on posts (created_at desc);
create index posts_post_type_created_at_idx on posts (post_type, created_at desc);

create table comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 300),
  relay_count int not null default 0,
  narrative_beat_id bigint,
  narrative_signal_id bigint,
  created_at timestamptz not null default now()
);

create index comments_post_id_idx on comments (post_id);

create table trending_snapshots (
  id bigint generated always as identity primary key,
  snapshot_date date not null default current_date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (snapshot_date)
);

create table post_likes (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id bigint not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_likes_post_id_idx on post_likes (post_id);

create table post_reactions (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id bigint not null references posts(id) on delete cascade,
  kind reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_reactions_post_id_idx on post_reactions (post_id);

create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create index follows_follower_id_idx on follows (follower_id);
create index follows_following_id_idx on follows (following_id);

create table post_bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id bigint not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_bookmarks_user_id_idx on post_bookmarks (user_id);
create index post_bookmarks_post_id_idx on post_bookmarks (post_id);

create table comment_likes (
  user_id uuid not null references profiles(id) on delete cascade,
  comment_id bigint not null references comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index comment_likes_comment_id_idx on comment_likes (comment_id);

create table comment_bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  comment_id bigint not null references comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index comment_bookmarks_user_id_idx on comment_bookmarks (user_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind notification_kind not null,
  actor_id uuid references profiles(id) on delete set null,
  post_id bigint references posts(id) on delete cascade,
  comment_id bigint references comments(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on notifications (user_id, created_at desc);
create index notifications_user_unread_idx on notifications (user_id) where read_at is null;
create index notifications_comment_id_idx on notifications (comment_id);

create table post_polls (
  post_id bigint primary key references posts(id) on delete cascade,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table post_poll_options (
  id bigint generated always as identity primary key,
  post_id bigint not null references post_polls(post_id) on delete cascade,
  position int not null check (position >= 0 and position <= 3),
  label text not null check (char_length(label) >= 1 and char_length(label) <= 25),
  votes_count int not null default 0 check (votes_count >= 0),
  unique (post_id, position)
);

create index post_poll_options_post_id_idx on post_poll_options (post_id);

create table post_poll_votes (
  post_id bigint not null references post_polls(post_id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  option_id bigint not null references post_poll_options(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, voter_id)
);

create index post_poll_votes_post_id_idx on post_poll_votes (post_id);

-- Narrative
create table narrative_arcs (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  synopsis text not null default '',
  mode narrative_arc_mode not null default 'scripted',
  status narrative_arc_status not null default 'draft',
  baseline_event_slug text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table narrative_beats (
  id bigint generated always as identity primary key,
  arc_id bigint not null references narrative_arcs(id) on delete cascade,
  sort_order int not null,
  kind narrative_beat_kind not null,
  run_at timestamptz not null,
  status narrative_beat_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (arc_id, sort_order)
);

create index narrative_beats_pending_run_at_idx
  on narrative_beats (run_at)
  where status = 'pending';

create table narrative_signals (
  id bigint generated always as identity primary key,
  kind narrative_signal_kind not null,
  author_id uuid not null references profiles(id) on delete cascade,
  post_id bigint references posts(id) on delete cascade,
  comment_id bigint references comments(id) on delete cascade,
  reaction_kind text,
  mentioned_username text,
  priority int not null default 10,
  status narrative_signal_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  attempt_count int not null default 0,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index narrative_signals_pending_priority_idx
  on narrative_signals (priority desc, created_at asc)
  where status = 'pending';

alter table posts
  add constraint posts_narrative_beat_id_fkey
    foreign key (narrative_beat_id) references narrative_beats(id) on delete set null,
  add constraint posts_narrative_signal_id_fkey
    foreign key (narrative_signal_id) references narrative_signals(id) on delete set null;

alter table comments
  add constraint comments_narrative_beat_id_fkey
    foreign key (narrative_beat_id) references narrative_beats(id) on delete set null,
  add constraint comments_narrative_signal_id_fkey
    foreign key (narrative_signal_id) references narrative_signals(id) on delete set null;

-- RLS
alter table profiles enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table trending_snapshots enable row level security;
alter table post_likes enable row level security;
alter table post_reactions enable row level security;
alter table follows enable row level security;
alter table post_bookmarks enable row level security;
alter table comment_likes enable row level security;
alter table comment_bookmarks enable row level security;
alter table notifications enable row level security;
alter table post_polls enable row level security;
alter table post_poll_options enable row level security;
alter table post_poll_votes enable row level security;
alter table narrative_arcs enable row level security;
alter table narrative_beats enable row level security;
alter table narrative_signals enable row level security;

create policy "profiles_select_public"
  on profiles for select to anon, authenticated using (true);

create policy "profiles_insert_own"
  on profiles for insert to authenticated
  with check (id = auth.uid() and is_npc = false);

create policy "profiles_update_own"
  on profiles for update to authenticated
  using (id = auth.uid() and is_npc = false)
  with check (id = auth.uid() and is_npc = false);

create policy "posts_select_public"
  on posts for select to anon, authenticated using (true);

create policy "posts_insert_human"
  on posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_npc = false)
  );

create policy "posts_delete_own"
  on posts for delete to authenticated
  using (author_id = auth.uid());

create policy "comments_select_public"
  on comments for select to anon, authenticated using (true);

create policy "comments_insert_human"
  on comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_npc = false)
  );

create policy "comments_delete_own"
  on comments for delete to authenticated
  using (author_id = auth.uid());

create policy "trending_snapshots_select_public"
  on trending_snapshots for select to anon, authenticated using (true);

create policy "post_likes_select_public"
  on post_likes for select to anon, authenticated using (true);

create policy "post_likes_insert_own"
  on post_likes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_npc = false)
  );

create policy "post_likes_delete_own"
  on post_likes for delete to authenticated
  using (user_id = auth.uid());

create policy "post_reactions_select_public"
  on post_reactions for select to anon, authenticated using (true);

create policy "post_reactions_insert_own"
  on post_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_npc = false)
  );

create policy "post_reactions_update_own"
  on post_reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "post_reactions_delete_own"
  on post_reactions for delete to authenticated
  using (user_id = auth.uid());

create policy "follows_select_public"
  on follows for select to anon, authenticated using (true);

create policy "follows_insert_own"
  on follows for insert to authenticated
  with check (
    follower_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_npc = false)
  );

create policy "follows_delete_own"
  on follows for delete to authenticated
  using (follower_id = auth.uid());

create policy "post_bookmarks_select_own"
  on post_bookmarks for select to authenticated
  using (user_id = auth.uid());

create policy "post_bookmarks_insert_own"
  on post_bookmarks for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_npc = false)
  );

create policy "post_bookmarks_delete_own"
  on post_bookmarks for delete to authenticated
  using (user_id = auth.uid());

create policy "comment_likes_select_public"
  on comment_likes for select to anon, authenticated using (true);

create policy "comment_likes_insert_own"
  on comment_likes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "comment_likes_delete_own"
  on comment_likes for delete to authenticated
  using (auth.uid() = user_id);

create policy "comment_bookmarks_select_own"
  on comment_bookmarks for select to authenticated
  using (auth.uid() = user_id);

create policy "comment_bookmarks_insert_own"
  on comment_bookmarks for insert to authenticated
  with check (auth.uid() = user_id);

create policy "comment_bookmarks_delete_own"
  on comment_bookmarks for delete to authenticated
  using (auth.uid() = user_id);

create policy "notifications_select_own"
  on notifications for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "post_polls_select_public"
  on post_polls for select to anon, authenticated using (true);

create policy "post_poll_options_select_public"
  on post_poll_options for select to anon, authenticated using (true);

create policy "post_poll_votes_select_public"
  on post_poll_votes for select to anon, authenticated using (true);

create policy "post_poll_votes_insert_own"
  on post_poll_votes for insert to authenticated
  with check (auth.uid() = voter_id);

create policy "post_poll_votes_update_own"
  on post_poll_votes for update to authenticated
  using (auth.uid() = voter_id)
  with check (auth.uid() = voter_id);

create policy "post_polls_insert_author"
  on post_polls for insert to authenticated
  with check (exists (select 1 from posts where id = post_id and author_id = auth.uid()));

create policy "post_poll_options_insert_author"
  on post_poll_options for insert to authenticated
  with check (exists (select 1 from posts where id = post_id and author_id = auth.uid()));

create policy "post_polls_update_author"
  on post_polls for update to authenticated
  using (exists (select 1 from posts where id = post_id and author_id = auth.uid()))
  with check (exists (select 1 from posts where id = post_id and author_id = auth.uid()));

create policy "narrative_arcs_select_public"
  on narrative_arcs for select to anon, authenticated using (true);

create policy "narrative_beats_select_public"
  on narrative_beats for select to anon, authenticated using (true);

create policy "narrative_signals_select_public"
  on narrative_signals for select to anon, authenticated using (true);

-- Functions
create or replace function public.sync_post_likes_count()
returns trigger language plpgsql security definer set search_path = public as $$
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

create or replace function public.sync_post_reaction_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.kind = 'relay' then
      update posts set relay_count = relay_count + 1 where id = new.post_id;
    elsif new.kind = 'amplify' then
      update posts set amplify_count = amplify_count + 1 where id = new.post_id;
    else
      update posts set flag_count = flag_count + 1 where id = new.post_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.kind = 'relay' then
      update posts set relay_count = greatest(relay_count - 1, 0) where id = old.post_id;
    elsif old.kind = 'amplify' then
      update posts set amplify_count = greatest(amplify_count - 1, 0) where id = old.post_id;
    else
      update posts set flag_count = greatest(flag_count - 1, 0) where id = old.post_id;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if old.kind = 'relay' then
      update posts set relay_count = greatest(relay_count - 1, 0) where id = old.post_id;
    elsif old.kind = 'amplify' then
      update posts set amplify_count = greatest(amplify_count - 1, 0) where id = old.post_id;
    else
      update posts set flag_count = greatest(flag_count - 1, 0) where id = old.post_id;
    end if;
    if new.kind = 'relay' then
      update posts set relay_count = relay_count + 1 where id = new.post_id;
    elsif new.kind = 'amplify' then
      update posts set amplify_count = amplify_count + 1 where id = new.post_id;
    else
      update posts set flag_count = flag_count + 1 where id = new.post_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

create or replace function public.sync_comment_like_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update comments set relay_count = relay_count + 1 where id = new.comment_id;
    return new;
  elsif tg_op = 'DELETE' then
    update comments set relay_count = greatest(relay_count - 1, 0) where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$;

create or replace function public.total_flags_last_24h()
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(flag_count), 0)::bigint
  from posts
  where created_at >= now() - interval '24 hours';
$$;

grant execute on function public.total_flags_last_24h() to anon, authenticated, service_role;

create or replace function public.apply_poll_vote_change(
  p_post_id bigint, p_voter_id uuid, p_new_option_id bigint
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old_option_id bigint;
  v_poll_ends timestamptz;
begin
  if auth.uid() is distinct from p_voter_id then raise exception 'Unauthorized voter'; end if;
  select ends_at into v_poll_ends from post_polls where post_id = p_post_id;
  if v_poll_ends is null then raise exception 'Poll not found'; end if;
  if v_poll_ends <= now() then raise exception 'Poll expired'; end if;
  if not exists (select 1 from post_poll_options where id = p_new_option_id and post_id = p_post_id) then
    raise exception 'Invalid option';
  end if;
  select option_id into v_old_option_id from post_poll_votes where post_id = p_post_id and voter_id = p_voter_id;
  if v_old_option_id is not null then
    if v_old_option_id = p_new_option_id then return; end if;
    update post_poll_options set votes_count = greatest(0, votes_count - 1) where id = v_old_option_id;
    update post_poll_votes set option_id = p_new_option_id, created_at = now()
      where post_id = p_post_id and voter_id = p_voter_id;
  else
    insert into post_poll_votes (post_id, voter_id, option_id) values (p_post_id, p_voter_id, p_new_option_id);
  end if;
  update post_poll_options set votes_count = votes_count + 1 where id = p_new_option_id;
end;
$$;

create or replace function public.apply_poll_vote_npc(
  p_post_id bigint, p_voter_id uuid, p_new_option_id bigint
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old_option_id bigint;
  v_poll_ends timestamptz;
begin
  select ends_at into v_poll_ends from post_polls where post_id = p_post_id;
  if v_poll_ends is null or v_poll_ends <= now() then return; end if;
  if not exists (select 1 from post_poll_options where id = p_new_option_id and post_id = p_post_id) then return; end if;
  select option_id into v_old_option_id from post_poll_votes where post_id = p_post_id and voter_id = p_voter_id;
  if v_old_option_id is not null then
    if v_old_option_id = p_new_option_id then return; end if;
    update post_poll_options set votes_count = greatest(0, votes_count - 1) where id = v_old_option_id;
    update post_poll_votes set option_id = p_new_option_id, created_at = now()
      where post_id = p_post_id and voter_id = p_voter_id;
  else
    insert into post_poll_votes (post_id, voter_id, option_id) values (p_post_id, p_voter_id, p_new_option_id);
  end if;
  update post_poll_options set votes_count = votes_count + 1 where id = p_new_option_id;
end;
$$;

grant execute on function public.apply_poll_vote_change(bigint, uuid, bigint) to authenticated;
grant execute on function public.apply_poll_vote_npc(bigint, uuid, bigint) to service_role;

create or replace function public.increment_post_view(p_post_id bigint)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update posts p
  set view_count = p.view_count + 1
  from profiles pr
  where p.id = p_post_id and p.author_id = pr.id and pr.is_npc = false
  returning p.view_count into v;
  return coalesce(v, 0);
end;
$$;

grant execute on function public.increment_post_view(bigint) to anon, authenticated;

create or replace function public.auth_email_exists(target_email text)
returns boolean language sql security definer set search_path = auth, public as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(target_email)));
$$;

revoke all on function public.auth_email_exists(text) from public;
grant execute on function public.auth_email_exists(text) to service_role;

create or replace function public.enqueue_welcome_signals(p_user_id uuid, p_username text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from narrative_signals where author_id = p_user_id and kind = 'human_joined') then
    return;
  end if;
  update profiles set welcome_focus_until = now() + interval '48 hours' where id = p_user_id;
  insert into narrative_signals (kind, author_id, priority, payload) values
    ('human_joined', p_user_id, 48, jsonb_build_object('username', p_username, 'beat', 'welcome', 'wave_index', 0)),
    ('human_joined', p_user_id, 46, jsonb_build_object('username', p_username, 'beat', 'suspicion', 'wave_index', 1)),
    ('human_joined', p_user_id, 44, jsonb_build_object('username', p_username, 'beat', 'rumor', 'wave_index', 2)),
    ('human_joined', p_user_id, 42, jsonb_build_object('username', p_username, 'beat', 'archive', 'wave_index', 3));
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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
    'https://api.dicebear.com/9.x/bottts-neutral/png?seed=' || new.id::text,
    false,
    0
  );
  perform public.enqueue_welcome_signals(new.id, final_username);
  return new;
end;
$$;

-- Triggers
create trigger post_likes_count_insert
  after insert on post_likes for each row execute function public.sync_post_likes_count();
create trigger post_likes_count_delete
  after delete on post_likes for each row execute function public.sync_post_likes_count();
create trigger post_reactions_count_sync
  after insert or update or delete on post_reactions
  for each row execute function public.sync_post_reaction_counts();
create trigger comment_likes_count_sync
  after insert or delete on comment_likes
  for each row execute function public.sync_comment_like_counts();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Realtime
alter table posts replica identity full;
alter table comments replica identity full;
alter table profiles replica identity full;
alter table notifications replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'posts') then
    alter publication supabase_realtime add table posts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'comments') then
    alter publication supabase_realtime add table comments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- Storage
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post_media_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-media');

create policy "post_media_auth_upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "post_media_auth_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
