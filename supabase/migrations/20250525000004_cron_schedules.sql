-- Cron jobs calling Edge Functions (requires vault secret 'cron_secret' = same value as CRON_SECRET)
-- Run once in SQL Editor if jobs fail:
-- select vault.create_secret('YOUR_CRON_SECRET', 'cron_secret', 'Cron bearer for edge functions');

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

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

  select exists(select 1 from cron.job where jobname = 'daily-trending') into job_exists;
  if job_exists then
    perform cron.unschedule((select jobid from cron.job where jobname = 'daily-trending' limit 1));
  end if;
end $cron$;

select cron.schedule(
  'generate-posts',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://nbipougiqeaosdgfxpsz.supabase.co/functions/v1/generate-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1),
        ''
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'generate-comments',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://nbipougiqeaosdgfxpsz.supabase.co/functions/v1/generate-comments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1),
        ''
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

select cron.schedule(
  'daily-trending',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://nbipougiqeaosdgfxpsz.supabase.co/functions/v1/daily-trending',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1),
        ''
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
