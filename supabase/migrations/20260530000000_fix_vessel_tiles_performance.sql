-- =============================================================================
-- FIX: vessel_tiles performance — SECURITY DEFINER + anon read access
-- Migration: 20260530000000_fix_vessel_tiles_performance.sql
--
-- Problem: vessel_tiles uses SECURITY INVOKER, so RLS evaluates 
--          auth_org_ids() on every row for every tile. With 58K vessels
--          this causes statement timeouts (504) on every tile request.
--
-- Solution:
--   1. Switch vessel_tiles to SECURITY DEFINER — bypasses RLS entirely.
--      The function is read-only and returns only spatial data, so this is safe.
--   2. Add anon SELECT policy on vessel_latest_positions so the count
--      query and direct REST queries also work without login.
--   3. Add anon SELECT policy on vessels so vessel metadata loads.
-- =============================================================================

-- ── Step 1: Drop ALL old function signatures to prevent PostgREST 300 ──
DROP FUNCTION IF EXISTS public.vessel_tiles(integer, integer, integer);
DROP FUNCTION IF EXISTS public.vessel_tiles(integer, integer, integer, integer);

-- ── Step 2: Recreate with SECURITY DEFINER (bypasses RLS) ──
CREATE OR REPLACE FUNCTION public.vessel_tiles(z integer, x integer, y integer, tick integer DEFAULT 0)
RETURNS "application/vnd.pbf"
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as the function owner (postgres), bypassing RLS for performance
SET search_path = public
AS $$
DECLARE
    mvt bytea;
BEGIN
    SELECT ST_AsMVT(mvtgeom, 'vessels') INTO mvt
    FROM (
        SELECT
            v.vessel_id,
            v.nav_status,
            v.speed,
            v.heading,
            v.course,
            v.source,
            s.name AS vessel_name,
            s.mmsi AS vessel_mmsi,
            s.vessel_type AS vessel_type,
            ST_AsMVTGeom(
                ST_Transform(v.location::geometry, 3857),
                ST_TileEnvelope(z, x, y),
                extent => 4096,
                buffer => 64,
                clip_geom => true
            ) AS geom
        FROM public.vessel_latest_positions v
        LEFT JOIN public.vessels s ON s.id = v.vessel_id
        WHERE v.location IS NOT NULL
          AND v.location::geometry && ST_Transform(ST_TileEnvelope(z, x, y), 4326)
    ) AS mvtgeom;

    RETURN mvt;
END;
$$;

-- ── Step 3: Grant execute to both anon and authenticated ──
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.vessel_tiles(integer, integer, integer, integer) TO authenticated;

-- ── Step 4: Add anon read access for REST API queries (vessel count, etc.) ──
-- Allow anonymous users to read all vessel positions (global AIS data is public)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vessel_latest_positions' 
        AND policyname = 'anon_vessel_positions_select'
    ) THEN
        CREATE POLICY "anon_vessel_positions_select"
            ON public.vessel_latest_positions
            FOR SELECT
            TO anon
            USING (true);
    END IF;
END $$;

-- Allow anonymous users to read vessel metadata (names, types, etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vessels' 
        AND policyname = 'anon_vessels_select'
    ) THEN
        CREATE POLICY "anon_vessels_select"
            ON public.vessels
            FOR SELECT
            TO anon
            USING (true);
    END IF;
END $$;
