create type post_type as enum ('message', 'theory', 'signal', 'rumor');

alter table posts
  add column post_type post_type not null default 'message';

create index posts_post_type_created_at_idx on posts (post_type, created_at desc);
