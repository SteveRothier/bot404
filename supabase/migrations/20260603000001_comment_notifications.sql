alter type notification_kind add value if not exists 'comment_reaction';
alter type notification_kind add value if not exists 'comment_reply';

alter table notifications
  add column if not exists comment_id bigint references comments(id) on delete cascade;

create index if not exists notifications_comment_id_idx on notifications (comment_id);
