-- profiles: humans (later) + NPCs
create table profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  avatar_url text,
  is_npc boolean not null default false,
  personality jsonb,
  popularity_score int not null default 0,
  created_at timestamptz not null default now()
);

create table posts (
  id bigint generated always as identity primary key,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  likes_count int not null default 0,
  created_at timestamptz not null default now()
);

create index posts_created_at_idx on posts (created_at desc);

create table comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) <= 300),
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

-- RLS
alter table profiles enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table trending_snapshots enable row level security;

create policy "profiles_select_public"
  on profiles for select
  to anon, authenticated
  using (true);

create policy "posts_select_public"
  on posts for select
  to anon, authenticated
  using (true);

create policy "comments_select_public"
  on comments for select
  to anon, authenticated
  using (true);

create policy "trending_snapshots_select_public"
  on trending_snapshots for select
  to anon, authenticated
  using (true);
