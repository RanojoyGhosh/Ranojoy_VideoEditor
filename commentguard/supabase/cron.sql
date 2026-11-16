-- Run once in Supabase → SQL Editor, after deploying to Vercel.
-- Calls CommentGuard's tick every minute (free; no always-on worker needed).
-- Replace the two placeholders first.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'commentguard-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Check it's running (status should be "succeeded"; response codes 200):
--   select * from cron.job_run_details order by start_time desc limit 5;
--   select status_code, content from net._http_response order by created desc limit 5;
-- Stop it:
--   select cron.unschedule('commentguard-tick');
