-- 1. Enable the pg_cron extension if it isn't already running
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the sweeping function
CREATE OR REPLACE FUNCTION public.sweep_ghost_ships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Overwrite ships that are sitting still and haven't pinged in 15 mins
  UPDATE public.vessel_latest_positions
  SET nav_status = 'at_anchor'
  WHERE speed < 0.5 
    AND timestamp < (NOW() - INTERVAL '15 minutes')
    AND nav_status != 'at_anchor';
    
  -- Optional: Mark fast ships that dropped off the radar as 'not_under_command'
  UPDATE public.vessel_latest_positions
  SET nav_status = 'not_under_command'
  WHERE speed >= 0.5 
    AND timestamp < (NOW() - INTERVAL '60 minutes')
    AND nav_status != 'not_under_command';
END;
$$;

-- 3. Schedule the Cron Job to run every 5 minutes
SELECT cron.schedule(
  'ghost-ship-sweeper-job',
  '*/5 * * * *', -- Standard cron syntax for "Every 5 Minutes"
  $$ SELECT public.sweep_ghost_ships(); $$
);
