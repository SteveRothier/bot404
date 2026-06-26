-- Tick narratif : pg_cron Supabase (plan Vercel Hobby = max 1 cron/jour côté Vercel).
-- Requiert vault secret 'cron_secret' (= CRON_SECRET sur Vercel).
-- Révoqué par 20260612000002_revert_narrative_tick_supabase_cron.sql

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $cron$
declare
  job_exists boolean;
begin
  select exists(select 1 from cron.job where jobname = 'narrative-tick') into job_exists;
  if job_exists then
    perform cron.unschedule((select jobid from cron.job where jobname = 'narrative-tick' limit 1));
  end if;
end $cron$;

select cron.schedule(
  'narrative-tick',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://bot404.vercel.app/api/narrative/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1),
        ''
      )
    )
  ) as request_id;
  $$
);
