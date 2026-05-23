-- =============================================================================
-- MARINE TRACK — Automation Triggers (Production)
-- Migration: 20260522000002_functions_triggers.sql
-- =============================================================================

-- Drop existing trigger/function to ensure clean deployment
DROP TRIGGER IF EXISTS trigger_archive_vessel_position ON public.vessel_latest_positions;
DROP FUNCTION IF EXISTS public.archive_vessel_position();

-- Create the automation function
CREATE OR REPLACE FUNCTION public.archive_vessel_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only archive if it is a completely new ping OR the ship actually moved/changed status
    IF (TG_OP = 'INSERT') OR 
       (TG_OP = 'UPDATE' AND (
           NEW.location::text != OLD.location::text OR 
           NEW.timestamp != OLD.timestamp OR 
           NEW.nav_status != OLD.nav_status
       )) THEN
        
        INSERT INTO public.vessel_position_history (
            vessel_id, org_id, location, heading, course, speed, nav_status, timestamp, source
        ) VALUES (
            NEW.vessel_id, NEW.org_id, NEW.location, NEW.heading, NEW.course, NEW.speed, NEW.nav_status, NEW.timestamp, NEW.source
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Attach the trigger to the live table
CREATE TRIGGER trigger_archive_vessel_position
AFTER INSERT OR UPDATE ON public.vessel_latest_positions
FOR EACH ROW
EXECUTE FUNCTION public.archive_vessel_position();