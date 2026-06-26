-- Unify NPC generation on narrative tick (disable legacy Edge ambient cron).
-- Apply narrative tick via /api/narrative/tick or npm run npc:tick.

alter type narrative_signal_status add value if not exists 'failed';

alter table narrative_signals
  add column if not exists attempt_count int not null default 0;

do $cron$
declare
  job_exists boolean;
begin
  select exists(select 1 from cron.job where jobname = 'generate-posts') into job_exists;
  if job_exists then
    perform cron.unschedule((select jobid from cron.job where jobname = 'generate-posts' limit 1));
  end if;

  select exists(select 1 from cron.job where jobname = 'generate-comments') into job_exists;
  if job_exists then
    perform cron.unschedule((select jobid from cron.job where jobname = 'generate-comments' limit 1));
  end if;
end $cron$;
