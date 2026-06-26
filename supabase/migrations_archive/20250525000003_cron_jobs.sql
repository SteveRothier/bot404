-- Enable extensions (may already exist on Supabase hosted)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Replace YOUR_PROJECT_REF with your Supabase project ref after deploy
-- Or configure via Dashboard > Database > Cron Jobs

-- Example cron (run manually in SQL Editor if pg_cron schedule fails locally):
-- select cron.schedule('generate-posts', '0 * * * *', ...);
