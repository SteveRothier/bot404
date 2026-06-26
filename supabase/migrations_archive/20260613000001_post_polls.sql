-- Sondages attachés aux posts (1 poll par post)

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

alter table post_polls enable row level security;
alter table post_poll_options enable row level security;
alter table post_poll_votes enable row level security;

create policy "post_polls_select_public"
  on post_polls for select
  to anon, authenticated
  using (true);

create policy "post_poll_options_select_public"
  on post_poll_options for select
  to anon, authenticated
  using (true);

create policy "post_poll_votes_select_public"
  on post_poll_votes for select
  to anon, authenticated
  using (true);

create policy "post_poll_votes_insert_own"
  on post_poll_votes for insert
  to authenticated
  with check (auth.uid() = voter_id);

create policy "post_poll_votes_update_own"
  on post_poll_votes for update
  to authenticated
  using (auth.uid() = voter_id)
  with check (auth.uid() = voter_id);

create policy "post_polls_insert_author"
  on post_polls for insert
  to authenticated
  with check (
    exists (
      select 1 from posts
      where id = post_id and author_id = auth.uid()
    )
  );

create policy "post_poll_options_insert_author"
  on post_poll_options for insert
  to authenticated
  with check (
    exists (
      select 1 from posts
      where id = post_id and author_id = auth.uid()
    )
  );

-- Ajustement atomique des compteurs lors d'un changement de vote
create or replace function public.apply_poll_vote_change(
  p_post_id bigint,
  p_voter_id uuid,
  p_new_option_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_option_id bigint;
  v_poll_ends timestamptz;
begin
  if auth.uid() is distinct from p_voter_id then
    raise exception 'Unauthorized voter';
  end if;

  select ends_at into v_poll_ends
  from post_polls
  where post_id = p_post_id;

  if v_poll_ends is null then
    raise exception 'Poll not found';
  end if;

  if v_poll_ends <= now() then
    raise exception 'Poll expired';
  end if;

  if not exists (
    select 1 from post_poll_options
    where id = p_new_option_id and post_id = p_post_id
  ) then
    raise exception 'Invalid option';
  end if;

  select option_id into v_old_option_id
  from post_poll_votes
  where post_id = p_post_id and voter_id = p_voter_id;

  if v_old_option_id is not null then
    if v_old_option_id = p_new_option_id then
      return;
    end if;
    update post_poll_options
    set votes_count = greatest(0, votes_count - 1)
    where id = v_old_option_id;
    update post_poll_votes
    set option_id = p_new_option_id, created_at = now()
    where post_id = p_post_id and voter_id = p_voter_id;
  else
    insert into post_poll_votes (post_id, voter_id, option_id)
    values (p_post_id, p_voter_id, p_new_option_id);
  end if;

  update post_poll_options
  set votes_count = votes_count + 1
  where id = p_new_option_id;
end;
$$;

-- Vote NPC / service role (sans auth.uid())
create or replace function public.apply_poll_vote_npc(
  p_post_id bigint,
  p_voter_id uuid,
  p_new_option_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_option_id bigint;
  v_poll_ends timestamptz;
begin
  select ends_at into v_poll_ends
  from post_polls
  where post_id = p_post_id;

  if v_poll_ends is null or v_poll_ends <= now() then
    return;
  end if;

  if not exists (
    select 1 from post_poll_options
    where id = p_new_option_id and post_id = p_post_id
  ) then
    return;
  end if;

  select option_id into v_old_option_id
  from post_poll_votes
  where post_id = p_post_id and voter_id = p_voter_id;

  if v_old_option_id is not null then
    if v_old_option_id = p_new_option_id then
      return;
    end if;
    update post_poll_options
    set votes_count = greatest(0, votes_count - 1)
    where id = v_old_option_id;
    update post_poll_votes
    set option_id = p_new_option_id, created_at = now()
    where post_id = p_post_id and voter_id = p_voter_id;
  else
    insert into post_poll_votes (post_id, voter_id, option_id)
    values (p_post_id, p_voter_id, p_new_option_id);
  end if;

  update post_poll_options
  set votes_count = votes_count + 1
  where id = p_new_option_id;
end;
$$;

grant execute on function public.apply_poll_vote_change(bigint, uuid, bigint) to authenticated;
grant execute on function public.apply_poll_vote_npc(bigint, uuid, bigint) to service_role;
