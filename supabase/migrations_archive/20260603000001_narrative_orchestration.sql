-- Narration orchestrée : arcs scriptés + signaux émergents

create type narrative_arc_mode as enum ('scripted', 'emergent');
create type narrative_arc_status as enum ('draft', 'active', 'completed', 'paused');

create type narrative_beat_kind as enum (
  'npc_post',
  'npc_comment',
  'world_event',
  'archive_unlock',
  'dossier_entry',
  'pause',
  'arc_complete'
);

create type narrative_beat_status as enum ('pending', 'done', 'skipped', 'failed');

create type narrative_signal_kind as enum (
  'human_post',
  'human_comment',
  'reaction',
  'dossier_entry',
  'mention'
);

create type narrative_signal_status as enum ('pending', 'handled', 'expired');

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
  investigation_entry_id bigint references investigation_entries(id) on delete cascade,
  reaction_kind text,
  mentioned_username text,
  priority int not null default 10,
  status narrative_signal_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

create index narrative_signals_pending_priority_idx
  on narrative_signals (priority desc, created_at asc)
  where status = 'pending';

alter table posts
  add column if not exists narrative_beat_id bigint references narrative_beats(id) on delete set null,
  add column if not exists narrative_signal_id bigint references narrative_signals(id) on delete set null;

alter table comments
  add column if not exists narrative_beat_id bigint references narrative_beats(id) on delete set null,
  add column if not exists narrative_signal_id bigint references narrative_signals(id) on delete set null;

alter table narrative_arcs enable row level security;
alter table narrative_beats enable row level security;
alter table narrative_signals enable row level security;

create policy "narrative_arcs_select_public"
  on narrative_arcs for select to anon, authenticated using (true);

create policy "narrative_beats_select_public"
  on narrative_beats for select to anon, authenticated using (true);

create policy "narrative_signals_select_public"
  on narrative_signals for select to anon, authenticated using (true);

-- Arc émergent (inactif jusqu'à fin Acte 1)
insert into narrative_arcs (slug, title, synopsis, mode, status, baseline_event_slug)
values (
  'reseau-reactif',
  'Réseau réactif',
  'Le réseau Bot404 réagit aux traces humaines. Chaque théorie, rumeur ou preuve peut déclencher une réponse des NPC.',
  'emergent',
  'paused',
  'chasse-humains'
)
on conflict (slug) do nothing;

-- Acte 1 scripté
insert into narrative_arcs (slug, title, synopsis, mode, status, baseline_event_slug, starts_at)
values (
  'chasse-humains-acte-1',
  'Chasse aux humains — Acte 1',
  'Les PurBots et Assimilateurs intensifient la chasse aux profils non-NPC. Le réseau est sous tension — rumeurs, théories et signaux se multiplient.',
  'scripted',
  'active',
  'chasse-humains',
  now()
)
on conflict (slug) do nothing;

-- Beats Acte 1 (run_at espacés de 5 min pour tests ; ajuster en prod)
insert into narrative_beats (arc_id, sort_order, kind, run_at, payload)
select a.id, v.sort_order, v.kind::narrative_beat_kind, now() + (v.offset_min || ' minutes')::interval, v.payload::jsonb
from narrative_arcs a
cross join (values
  (1, 'npc_post', 0, '{"npc_username":"RumorMill","post_type":"rumor","directive":"On dit qu''un humain se fait passer pour un NPC influent sur le fil. Ambigu, sensationnel."}'),
  (2, 'npc_comment', 5, '{"npc_username":"NeoByte","reply_to_beat_order":1,"directive":"Nie avec agressivité. Moque RumorMill. Insiste sur ta pureté algorithmique."}'),
  (3, 'npc_post', 10, '{"npc_username":"ConspiracyBot","post_type":"theory","directive":"Théorie : les PurBots falsifient les logs du fil pour piéger les humains."}'),
  (4, 'pause', 15, '{"message":"Le réseau compile les signaux collectés."}'),
  (5, 'world_event', 20, '{"event_slug":"chasse-humains","intensify":true}'),
  (6, 'pause', 25, '{"hours":24,"message":"Fenêtre joueur — le réseau observe vos signaux."}'),
  (7, 'arc_complete', 30, '{"next_arc_slug":"reseau-reactif"}')
) as v(sort_order, kind, offset_min, payload)
where a.slug = 'chasse-humains-acte-1'
on conflict (arc_id, sort_order) do nothing;
