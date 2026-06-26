-- Annule le job pg_cron narrative-tick (retour au cron Vercel).

do $cron$
declare
  job_exists boolean;
begin
  select exists(select 1 from cron.job where jobname = 'narrative-tick') into job_exists;
  if job_exists then
    perform cron.unschedule((select jobid from cron.job where jobname = 'narrative-tick' limit 1));
  end if;
end $cron$;
