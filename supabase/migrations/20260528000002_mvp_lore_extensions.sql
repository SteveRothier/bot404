-- Étape 2 : réactions lore
create type reaction_kind as enum ('relay', 'amplify', 'flag');

create table post_reactions (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id bigint not null references posts(id) on delete cascade,
  kind reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index post_reactions_post_id_idx on post_reactions (post_id);

alter table posts
  add column if not exists relay_count int not null default 0,
  add column if not exists amplify_count int not null default 0,
  add column if not exists flag_count int not null default 0;

alter table post_reactions enable row level security;

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

create trigger post_reactions_count_sync
  after insert or update or delete on post_reactions
  for each row execute function public.sync_post_reaction_counts();

-- Étape 3 : factions
create table factions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  color text not null,
  description text,
  control_percent numeric(5, 2) not null default 25.00
);

alter table profiles
  add column if not exists faction_id uuid references factions(id),
  add column if not exists trust_score int not null default 50,
  add column if not exists influence_score int not null default 0;

alter table factions enable row level security;
create policy "factions_select_public" on factions for select to anon, authenticated using (true);

-- Étape 4 : activité réseau
create table network_activity (
  id bigint generated always as identity primary key,
  kind text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index network_activity_created_at_idx on network_activity (created_at desc);

alter table network_activity enable row level security;
create policy "network_activity_select_public"
  on network_activity for select to anon, authenticated using (true);

-- Étape 5 : événements mondiaux
create table world_events (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  description text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  effects jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table world_events enable row level security;
create policy "world_events_select_public"
  on world_events for select to anon, authenticated using (true);

-- Étape 6 : dossiers / enquêtes
create type investigation_status as enum ('open', 'closed', 'verified');

create table investigations (
  id bigint generated always as identity primary key,
  title text not null,
  description text not null,
  author_id uuid not null references profiles(id) on delete cascade,
  status investigation_status not null default 'open',
  created_at timestamptz not null default now()
);

create table investigation_entries (
  id bigint generated always as identity primary key,
  investigation_id bigint not null references investigations(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 1000),
  created_at timestamptz not null default now()
);

create type investigation_vote_kind as enum ('yes', 'no', 'uncertain');

create table investigation_votes (
  investigation_id bigint not null references investigations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  vote investigation_vote_kind not null,
  created_at timestamptz not null default now(),
  primary key (investigation_id, user_id)
);

alter table investigations enable row level security;
alter table investigation_entries enable row level security;
alter table investigation_votes enable row level security;

create policy "investigations_select_public"
  on investigations for select to anon, authenticated using (true);
create policy "investigations_insert_human"
  on investigations for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_npc = false)
  );

create policy "investigation_entries_select_public"
  on investigation_entries for select to anon, authenticated using (true);
create policy "investigation_entries_insert_human"
  on investigation_entries for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and is_npc = false)
  );

create policy "investigation_votes_select_public"
  on investigation_votes for select to anon, authenticated using (true);
create policy "investigation_votes_insert_own"
  on investigation_votes for insert to authenticated
  with check (user_id = auth.uid());
create policy "investigation_votes_update_own"
  on investigation_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Étape 7 : archives
create table archives (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  content text not null,
  unlocked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table archives enable row level security;
create policy "archives_select_unlocked"
  on archives for select to anon, authenticated
  using (unlocked_at is not null and unlocked_at <= now());
